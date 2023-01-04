import { detectPackageManager, getPackageManagerCommand } from '@nrwl/devkit';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { execSync } from 'child_process';
import * as cacheDir from 'find-cache-dir';

let projectGraphCacheDir: string | undefined;

export async function createProjectGraph() {
  return new Promise<void | string>((res, rej) => {
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
      const errorMessage = e.output[1].toString() || e.toString();
      getOutputChannel().appendLine(
        'Unable to create project graph: ' + errorMessage
      );
      rej(errorMessage);
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
