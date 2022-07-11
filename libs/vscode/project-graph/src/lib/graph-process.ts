import { detectPackageManager, getPackageManagerCommand } from '@nrwl/devkit';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { execSync } from 'child_process';
import * as cacheDir from 'find-cache-dir';

let projectGraphCacheDir: string | undefined;

export async function generateProjectGraph() {
  return new Promise<void>((res, rej) => {
    if (!projectGraphCacheDir) {
      projectGraphCacheDir = cacheDir({
        name: 'nx-console-project-graph',
        cwd: WorkspaceConfigurationStore.instance.get('nxWorkspacePath', ''),
      });
    }

    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );
    const packageManager = detectPackageManager(workspacePath);
    const command = getPackageManagerCommand(packageManager);

    // TODO(cammisuli): determine the correct command depending on Nx Version
    try {
      execSync(
        `${command.exec} nx dep-graph --open false --file ${
          getProjectGraphOutput().fullPath
        }`,
        {
          cwd: workspacePath,
        }
      );
      res();
    } catch (e) {
      console.log(e);
      rej();
    }
  });
}

export function getProjectGraphOutput() {
  const directory = projectGraphCacheDir ?? '.';
  return {
    directory,
    fullPath: `${directory}/project-graph.html`,
  };
}
