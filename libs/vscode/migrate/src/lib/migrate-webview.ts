import { gte } from '@nx-console/nx-version';
import { directoryExists } from '@nx-console/shared-file-system';
import { workspaceDependencyPath } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { readFileSync } from 'fs';
import type { MigrationsJsonEntry } from 'nx/src/config/misc-interfaces';
import { join } from 'path';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import {
  cancelMigration,
  skipMigration,
  undoMigration,
  viewDocumentation,
  viewImplementation,
} from './commands/migrate-commands';
import { watchFile } from '@nx-console/vscode-utils';
import { finishMigration } from './commands/finish-migration';
import {
  runManyMigrations,
  runSingleMigration,
} from './commands/run-migration';
import { viewDiffForMigration } from './git-extension/view-diff';

export class MigrateWebview {
  private _webviewPanel: WebviewPanel | undefined;

  constructor(private context: ExtensionContext) {}

  async openMigrateUi() {
    if (this._webviewPanel !== undefined) {
      this._webviewPanel.reveal();
      return;
    }
    const nxInstallationLocation = await workspaceDependencyPath(
      getNxWorkspacePath(),
      'nx',
    );
    if (!nxInstallationLocation) {
      window.showErrorMessage(
        'Error loading the Migrate UI. Did you run npm/yarn/pnpm install?',
      );
      return;
    }
    this._webviewPanel = window.createWebviewPanel(
      'nx-console',
      'Migrate UI',
      ViewColumn.Active,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [
          this.context.extensionUri,
          Uri.file(nxInstallationLocation),
        ],
      },
    );

    this._webviewPanel.webview.html = await this.loadMigrateHtml(
      this._webviewPanel,
    );

    this._webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'run-migration':
          runSingleMigration(
            message.payload.migration,
            message.payload.configuration,
          );
          break;
        case 'run-many':
          runManyMigrations(
            message.payload.migrations,
            message.payload.configuration,
          );
          break;
        case 'finish':
          finishMigration(message.payload.squashCommits);
          break;
        case 'cancel':
          cancelMigration();
          break;
        case 'file-click':
          viewDiffForMigration(message.payload.path, message.payload.migration);
          break;
        case 'skip-migration':
          skipMigration(message.payload.migration);
          break;
        case 'undo-migration':
          undoMigration(message.payload.migration);
          break;
        case 'view-implementation':
          viewImplementation(message.payload.migration);
          break;
        case 'view-documentation':
          viewDocumentation(message.payload.migration);
          break;
      }
    });

    const migrationJsonSubscription = watchFile(
      join(getNxWorkspacePath(), 'migrations.json'),
      async () => {
        this._webviewPanel.webview.postMessage({
          type: 'reload',
          data: this.getMigrateUIData(),
        });
      },
    );

    this._webviewPanel.onDidDispose(() => {
      this._webviewPanel = undefined;
      migrationJsonSubscription.dispose();
    });
  }

  closeMigrateUi() {
    if (this._webviewPanel) {
      this._webviewPanel.dispose();
    }
  }

  refresh() {
    if (this._webviewPanel) {
      this._webviewPanel.webview.postMessage({
        type: 'reload',
        data: this.getMigrateUIData(),
      });
    }
  }

  private async loadMigrateHtml(webviewPanel: WebviewPanel): Promise<string> {
    const graphHtmlLocation = await getGraphHtmlLocation(this.context);

    if (!graphHtmlLocation) {
      return '<div>Migrate UI failed to load. Please create an issue at <a href="https://github.com/nrwl/nx-console/issues">https://github.com/nrwl/nx-console/issues</a>.</div>';
    }

    const initialData = this.getMigrateUIData();

    const asWebviewUri = (path: string) =>
      webviewPanel.webview
        .asWebviewUri(Uri.joinPath(graphHtmlLocation, path))
        .toString();

    return `<html>
    <head>
    <script src="${asWebviewUri('environment.js')}"></script>
    <link rel="stylesheet" href="${asWebviewUri('styles.css')}">
    <style>
      body {
        background-color: var(--vscode-editor-background) !important;
        color: var(--vscode-editor-foreground) !important;
      }
      html {
        font-size: var(--vscode-font-size) !important;
      }
    </style>

    </head>
    <body>
        <script>
            window.__NX_RENDER_GRAPH__ = false;
        </script>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="app"></div>

        <script src="${asWebviewUri('runtime.js')}"></script>
        <script src="${asWebviewUri('styles.js')}"></script>
        <script src="${asWebviewUri('main.js')}"></script>
        <script>
          const data = ${JSON.stringify(initialData)}
          const migrateService = window.renderMigrate(data)

          const vscode = acquireVsCodeApi()
          // message to the extension
          window.externalApi.graphInteractionEventListener = (message) => {
            vscode.postMessage(message);
          }

          // messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            console.log('message', message);
            if(message.type === 'reload') {
              migrateService.send({
                type: 'loadData',
                ...message.data,
              });
            }
          });

        </script>
    </body>
    </html>`;
  }

  private getMigrateUIData(): {
    migrations: MigrationsJsonEntry[];
    'nx-console': any | undefined;
  } {
    const nxWorkspacePath = getNxWorkspacePath();
    const migrationsJsonPath = join(nxWorkspacePath, 'migrations.json');
    const migrationsJson = readFileSync(migrationsJsonPath, 'utf-8');
    return JSON.parse(migrationsJson);
  }
}

async function getGraphHtmlLocation(
  context: ExtensionContext,
): Promise<Uri | undefined> {
  const nxVersion = await getNxVersion();

  if (nxVersion && gte(nxVersion, '21.0.0')) {
    // Graph UI is first released in v21.
    const graphBasePath = await getGraphBasePath();
    if (graphBasePath) {
      return Uri.file(graphBasePath);
    }
  } else {
    // Otherwise, use bundled version
    return Uri.joinPath(
      context.extensionUri,
      'node_modules',
      'nx',
      'src',
      'core',
      'graph',
    );
  }
}

// TODO: don't simply duplicate this from nxls code?
async function getGraphBasePath(): Promise<string | undefined> {
  const nxWorkspaceDepPath = await workspaceDependencyPath(
    getNxWorkspacePath(),
    'nx',
  );

  if (!nxWorkspaceDepPath) {
    return undefined;
  }

  const graphBasePath = join(nxWorkspaceDepPath, 'src', 'core', 'graph');

  if (await directoryExists(graphBasePath)) {
    return graphBasePath;
  } else {
    return undefined;
  }
}
