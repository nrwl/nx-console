import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import {
  getNxWorkspace,
  getProjectGraphOutput,
} from '@nx-console/vscode/nx-workspace';
import {
  getOutputChannel,
  getShellExecutionForConfig,
} from '@nx-console/vscode/utils';
import { execSync } from 'child_process';
import * as cacheDir from 'find-cache-dir';

let projectGraphCacheDir: string | undefined;

export async function createProjectGraph() {
  const { isEncapsulatedNx, workspacePath } = await getNxWorkspace();
  const projectGraphOutput = await getProjectGraphOutput();

  return new Promise<void | string>((res, rej) => {
    if (!projectGraphCacheDir) {
      projectGraphCacheDir = cacheDir({
        name: 'nx-console-project-graph',
        cwd: workspacePath,
      });
    }

    const shellExecution = getShellExecutionForConfig({
      cwd: workspacePath,
      displayCommand: 'nx dep-graph --file ' + projectGraphOutput.relativePath,
      encapsulatedNx: isEncapsulatedNx,
    });

    getOutputChannel().appendLine(
      `Generating graph with command: \`${shellExecution.command}\``
    );
    try {
      execSync(shellExecution.commandLine ?? '', {
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
