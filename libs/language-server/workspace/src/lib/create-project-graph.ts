import { Logger } from '@nx-console/shared/schema';
import { getNxExecutionCommand } from '@nx-console/shared/utils';

import { execSync } from 'child_process';
import { ResponseError } from 'vscode-languageserver/node';
import { getProjectGraphOutput } from './get-project-graph-output';
import { nxWorkspace } from './workspace';

export async function createProjectGraph(
  workspacePath: string,
  logger: Logger = {
    log(message) {
      console.log(message);
    },
  }
): Promise<ResponseError | void> {
  const { isEncapsulatedNx } = await nxWorkspace(workspacePath);
  const projectGraphOutput = await getProjectGraphOutput(workspacePath);

  return new Promise<void | ResponseError>((res, rej) => {
    const command = getNxExecutionCommand({
      cwd: workspacePath,
      displayCommand: 'nx dep-graph --file ' + projectGraphOutput.relativePath,
      encapsulatedNx: isEncapsulatedNx,
    });

    logger.log(`Generating graph with command: \`${command}\``);
    try {
      execSync(command, {
        cwd: workspacePath,
      });

      res();
    } catch (e) {
      const errorMessage = e.output[1].toString() || e.toString();
      rej(
        new ResponseError(
          1000,
          'Unable to create project graph: ' + errorMessage
        )
      );
    }
  });
}
