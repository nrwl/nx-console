import { ExtensionContext } from 'vscode';
import { migrateMachine } from './migrate-state-machine';
import { createActor } from 'xstate';
import { MigrateSidebarViewProvider } from './migrate-sidebar-view-provider';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';

export function initMigrate(context: ExtensionContext): void {
  const actor = createActor(migrateMachine);
  actor.start();

  const updateWorkspaceData = async () => {
    const nxVersion = await getNxVersion();
    const workspacePath = getNxWorkspacePath();

    const migrationsJsonPath = join(workspacePath, 'migrations.json');
    const hasMigrationsJson = existsSync(migrationsJsonPath);
    const migrationsJsonSection =
      hasMigrationsJson && checkHasMigrationsSection(migrationsJsonPath);

    actor.send({
      type: 'UPDATE_WORKSPACE_DATA',
      value: {
        nxVersion,
        hasMigrationsJson,
        migrationsJsonSection,
      },
    });
  };

  updateWorkspaceData();
  context.subscriptions.push(onWorkspaceRefreshed(updateWorkspaceData));

  MigrateSidebarViewProvider.create(context, actor);
}

function checkHasMigrationsSection(
  migrationsJsonPath: string
): any | undefined {
  try {
    const migrationsJson = readFileSync(migrationsJsonPath, 'utf-8');
    const json = JSON.parse(migrationsJson);
    return json['nx-console'];
  } catch (error) {
    return undefined;
  }
}
