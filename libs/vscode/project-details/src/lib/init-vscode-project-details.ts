import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getNxVersion,
  getProjectByPath,
  getSourceMapFilesToProjectMap,
} from '@nx-console/vscode/nx-workspace';
import {
  getTelemetry,
  showNoProjectAtPathMessage,
} from '@nx-console/vscode/utils';
import { dirname, join } from 'path';
import { gte } from 'semver';
import {
  commands,
  ExtensionContext,
  TextDocument,
  Uri,
  ViewColumn,
  window,
  workspace,
} from 'vscode';
import { ConfigFileCodelensProvider } from './config-file-codelens-provider';
import { ProjectDetailsCodelensProvider } from './project-details-codelens-provider';
import { ProjectDetailsManager } from './project-details-manager';
import { ProjectDetailsProvider } from './project-details-provider';
import { showNoNxVersionMessage } from '@nx-console/vscode/output-channels';

export function initVscodeProjectDetails(context: ExtensionContext) {
  const nxWorkspacePath = getNxWorkspacePath();
  commands.executeCommand('setContext', 'nxConsole.ignoredPDVPaths', [
    join(nxWorkspacePath, 'package.json'),
  ]);

  registerCommand(context);
  setProjectDetailsFileContext();

  ProjectDetailsCodelensProvider.register(context);
  ConfigFileCodelensProvider.register(context);
}

function registerCommand(context: ExtensionContext) {
  const projectDetailsManager = new ProjectDetailsManager(context);
  const projectDetailsProvider = new ProjectDetailsProvider();
  workspace.registerTextDocumentContentProvider(
    'project-details',
    projectDetailsProvider
  );

  context.subscriptions.push(
    commands.registerCommand(
      'nx.project-details.openToSide',
      async (
        config:
          | {
              document?: TextDocument;
              expandTarget?: string;
            }
          | undefined
      ) => {
        const isEnabled = GlobalConfigurationStore.instance.get(
          'showProjectDetailsView'
        );
        if (!isEnabled) return;
        const nxVersion = await getNxVersion();
        getTelemetry().featureUsed('nx.open-pdv');

        if (!nxVersion) {
          showNoNxVersionMessage();
          return;
        }
        if (gte(nxVersion.full, '17.3.0-beta.3')) {
          let document = config?.document;
          if (!document) {
            document = window.activeTextEditor?.document;
          }
          if (!document) return;
          projectDetailsManager.openProjectDetailsToSide(
            document,
            config?.expandTarget
          );
        } else {
          const uri = window.activeTextEditor?.document.uri;
          if (!uri) return;
          const project = await getProjectByPath(uri.path);
          if (!project) {
            showNoProjectAtPathMessage(uri.path);
            return;
          }
          const doc = await workspace.openTextDocument(
            Uri.parse(`project-details:${project.name}.project.json`)
          );
          await window.showTextDocument(doc, {
            preview: false,
            viewColumn: ViewColumn.Beside,
          });
        }
      }
    )
  );
}

async function setProjectDetailsFileContext() {
  const setContext = async () => {
    const sourceMapFilesToProjectMap = await getSourceMapFilesToProjectMap();
    const nxWorkspacePath = getNxWorkspacePath();
    const pdvPaths = [
      ...new Set(
        Object.keys(sourceMapFilesToProjectMap ?? {}).flatMap((path) => [
          join(nxWorkspacePath, path),
          join(nxWorkspacePath, dirname(path), 'package.json'),
        ])
      ),
    ];
    commands.executeCommand('setContext', 'nxConsole.pdvPaths', pdvPaths);
  };

  setContext();
  onWorkspaceRefreshed(() => setContext());
}
