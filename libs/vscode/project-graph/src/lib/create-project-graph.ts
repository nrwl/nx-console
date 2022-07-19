import { detectPackageManager, getPackageManagerCommand } from '@nrwl/devkit';
import { getOutputChannel } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { execSync } from 'child_process';
import * as cacheDir from 'find-cache-dir';

let projectGraphCacheDir: string | undefined;

export async function createProjectGraph() {
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
    const packageCommand = getPackageManagerCommand(packageManager);

    // TODO(cammisuli): determine the correct command depending on Nx Version
    const command = `${packageCommand.exec} nx dep-graph --file ${
      getProjectGraphOutput().relativePath
    }`;

    getOutputChannel().appendLine(
      `Generating graph with command: \`${command}\``
    );
    try {
      execSync(command, {
        cwd: workspacePath,
      });

      res();
    } catch (e) {
      getOutputChannel().appendLine(
        'Unable to create project graph: ' + e.toString()
      );
      rej();
    }
  });
}

export function getProjectGraphOutput() {
  const directory = projectGraphCacheDir ?? '.';
  const fullPath = `${directory}/project-graph.html`;
  return {
    directory,
    relativePath:
      '.' +
      fullPath.replace(
        WorkspaceConfigurationStore.instance.get('nxWorkspacePath', ''),
        ''
      ),
    fullPath,
  };
}
