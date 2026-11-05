import { NxWorkspaceRefreshStartedNotification } from '@nx-console/language-server-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getNxlsClient,
  onWorkspaceRefreshed,
} from '@nx-console/vscode-lsp-client';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { httpRequest } from '@nx-console/shared-utils';
import { watchFile } from '@nx-console/vscode-utils';
import { execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
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
  const sidebar = MigrateSidebarViewProvider.create(context, actor);

  let wasUpdateAvailable = false;
  const sub = actor.subscribe(() => {
    setMigrateContext();
    const isUpdateAvailable = actor.getSnapshot().matches('update-available');
    if (isUpdateAvailable && !wasUpdateAvailable) {
      updatePendingChanges(actor, sidebar);
    }
    wasUpdateAvailable = isUpdateAvailable;
  });
  context.subscriptions.push({ dispose: () => sub.unsubscribe() });

  updateWorkspaceData(actor);
  updatePendingChanges(actor, sidebar);
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
      updatePendingChanges(actor, sidebar);
      refreshNxVersionInfo(actor);
    }),
  );

  refreshNxVersionInfo(actor);

  const migrateWebview = new MigrateWebview(context);
  registerCommands(context, migrateWebview);

  context.subscriptions.push(
    commands.registerCommand('nxMigrate.refresh', () => {
      updateWorkspaceData(actor);
      updatePendingChanges(actor, sidebar);
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
      updatePendingChanges(actor, sidebar);
    },
    context.subscriptions,
  );

  window.registerTerminalLinkProvider(new DiffEditorTerminalLinkProvider());
}
const execFileAsync = promisify(execFile);
let gitStatusQueue: Promise<boolean> = Promise.resolve(false);

async function updateWorkspaceData(actor: ActorRef<any, any>) {
  const nxVersion = await getNxVersion(true);
  const workspacePath = getNxWorkspacePath();

  const migrationsJsonPath = join(workspacePath, 'migrations.json');
  const hasMigrationsJson = existsSync(migrationsJsonPath);
  const migrationsJsonSection =
    hasMigrationsJson && checkHasMigrationsSection(migrationsJsonPath);

  actor.send({
    type: 'UPDATE_VIEW_DATA',
    value: {
      nxVersion,
      hasMigrationsJson,
      migrationsJsonSection,
    },
  });
}

async function updatePendingChanges(
  actor: ActorRef<any, any>,
  sidebar: MigrateSidebarViewProvider,
) {
  if (!sidebar.visible || !actor.getSnapshot().matches('update-available')) {
    return;
  }
  const hasPendingChanges = await hasPendingGitChanges(getNxWorkspacePath());
  actor.send({
    type: 'UPDATE_VIEW_DATA',
    value: { hasPendingChanges },
  });
}

function hasPendingGitChanges(workspacePath: string): Promise<boolean> {
  const check = gitStatusQueue.then(async () => {
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
        cwd: workspacePath,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      });
      return stdout.trim().length > 0;
    } catch (e) {
      // error, maybe we're not in a git repo
      return false;
    }
  });
  gitStatusQueue = check;
  return check;
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

type LatestNxVersion = { major: number; minor: number; full: string };

// Every workspace refresh asks for the latest version, and a refresh can run
// every few seconds while files change. Each request also keeps a connection
// open in the extension host for a while, so one answer is reused for an hour
// and callers share a request that is already running.
const LATEST_NX_VERSION_TTL_MS = 60 * 60_000;
const LATEST_NX_VERSION_RETRY_MS = 5 * 60_000;
let latestNxVersionCache:
  | { value: Promise<LatestNxVersion | undefined>; expiresAt: number }
  | undefined;

function getLatestNxVersion(): Promise<LatestNxVersion | undefined> {
  if (latestNxVersionCache && Date.now() < latestNxVersionCache.expiresAt) {
    return latestNxVersionCache.value;
  }
  const cache = {
    value: fetchLatestNxVersion().then((version) => {
      cache.expiresAt =
        Date.now() +
        (version ? LATEST_NX_VERSION_TTL_MS : LATEST_NX_VERSION_RETRY_MS);
      return version;
    }),
    expiresAt: Infinity,
  };
  latestNxVersionCache = cache;
  return cache.value;
}

async function fetchLatestNxVersion(): Promise<LatestNxVersion | undefined> {
  try {
    const response = await httpRequest({
      url: 'https://registry.npmjs.org/-/package/nx/dist-tags',
      timeout: 30_000,
    });
    const versionString = JSON.parse(response.responseText)?.latest;
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
    vscodeLogger.log(`Failed to get latest nx version: ${error}`);
    return undefined;
  }
}
