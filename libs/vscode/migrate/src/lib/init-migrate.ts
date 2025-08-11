import { NxWorkspaceRefreshStartedNotification } from '@nx-console/language-server-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getNxlsClient,
  onWorkspaceRefreshed,
} from '@nx-console/vscode-lsp-client';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getPackageInfo, watchFile } from '@nx-console/vscode-utils';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { coerce } from 'semver';
import { commands, ExtensionContext, window } from 'vscode';
import { ActorRef, createActor } from 'xstate';
import { registerCommands } from './commands/migrate-commands';
import { DiffEditorTerminalLinkProvider } from './diff-editor-terminal-link-provider';
import { MigrateSidebarViewProvider } from './migrate-sidebar-view-provider';
import { migrateMachine } from './migrate-state-machine';
import { MigrateWebview } from './migrate-webview';
export function initMigrate(context: ExtensionContext): void {
  const actor = createActor(migrateMachine);
  actor.start();

  const setMigrateContext = () => {
    const snapshot = actor.getSnapshot();

    const notStarted =
      snapshot.matches('default') || snapshot.matches('update-available');
    commands.executeCommand(
      'setContext',
      'nxMigrate.state.notStarted',
      notStarted,
    );

    const inProgress = snapshot.matches({
      'in-progress': 'default',
    });
    commands.executeCommand(
      'setContext',
      'nxMigrate.state.inProgress',
      inProgress,
    );

    const pendingPackageUpdates = snapshot.matches({
      'in-progress': 'pending-package-updates',
    });
    commands.executeCommand(
      'setContext',
      'nxMigrate.state.pendingPackageUpdates',
      pendingPackageUpdates,
    );
  };
  setMigrateContext();
  const sub = actor.subscribe(() => setMigrateContext());
  context.subscriptions.push({ dispose: () => sub.unsubscribe() });

  updateWorkspaceData(actor);
  context.subscriptions.push(
    getNxlsClient().onNotification(
      NxWorkspaceRefreshStartedNotification,
      () => {
        updateWorkspaceData(actor);
        refreshNxVersionInfo(actor);
      },
    ),
    onWorkspaceRefreshed(() => {
      updateWorkspaceData(actor);
      refreshNxVersionInfo(actor);
    }),
  );

  refreshNxVersionInfo(actor);

  MigrateSidebarViewProvider.create(context, actor);

  const migrateWebview = new MigrateWebview(context);
  registerCommands(context, migrateWebview);

  context.subscriptions.push(
    commands.registerCommand('nxMigrate.refresh', () => {
      updateWorkspaceData(actor);
      refreshNxVersionInfo(actor);
    }),
    commands.registerCommand('nxMigrate.refreshWebview', () => {
      migrateWebview.refresh();
    }),
  );

  watchFile(
    join(getNxWorkspacePath(), 'migrations.json'),
    () => {
      updateWorkspaceData(actor);
    },
    context.subscriptions,
  );

  window.registerTerminalLinkProvider(new DiffEditorTerminalLinkProvider());
}
async function updateWorkspaceData(actor: ActorRef<any, any>) {
  const nxVersion = await getNxVersion(true);
  const workspacePath = getNxWorkspacePath();

  const migrationsJsonPath = join(workspacePath, 'migrations.json');
  const hasMigrationsJson = existsSync(migrationsJsonPath);
  const migrationsJsonSection =
    hasMigrationsJson && checkHasMigrationsSection(migrationsJsonPath);

  let hasPendingChanges = false;
  try {
    hasPendingChanges =
      execSync('git status --porcelain', {
        cwd: workspacePath,
      })
        .toString()
        .trim().length > 0;
  } catch (e) {
    // error, maybe we're not in a git repo
  }

  actor.send({
    type: 'UPDATE_VIEW_DATA',
    value: {
      nxVersion,
      hasMigrationsJson,
      migrationsJsonSection,
      hasPendingChanges,
    },
  });
}
function checkHasMigrationsSection(
  migrationsJsonPath: string,
): any | undefined {
  try {
    const migrationsJson = readFileSync(migrationsJsonPath, 'utf-8');
    const json = JSON.parse(migrationsJson);
    return json['nx-console'];
  } catch (error) {
    return undefined;
  }
}

async function refreshNxVersionInfo(actor: ActorRef<any, any>) {
  const nxVersion = await getNxVersion(true);
  const latestNxVersion = await getLatestNxVersion();
  actor.send({
    type: 'UPDATE_VIEW_DATA',
    value: {
      currentNxVersion: nxVersion,
      latestNxVersion,
    },
  });
}

async function getLatestNxVersion() {
  try {
    const packageInfo = await getPackageInfo('nx');
    const versionString = packageInfo?.['dist-tags']?.latest;
    const nxVersion = coerce(versionString, {
      includePrerelease: true,
    });
    if (!nxVersion) {
      return undefined;
    }
    return {
      major: nxVersion.major,
      minor: nxVersion.minor,
      full: versionString,
    };
  } catch (error) {
    getOutputChannel().appendLine(`Failed to get latest nx version: ${error}`);
    return undefined;
  }
}
