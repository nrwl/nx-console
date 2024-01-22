import { Logger } from '@nx-console/shared/schema';
import { getNxExecutionCommand } from '@nx-console/shared/utils';

import { execSync } from 'child_process';
import { getProjectGraphOutput } from './get-project-graph-output';
import { nxWorkspace } from './workspace';

export async function createProjectGraph(
  workspacePath: string,
  showAffected: boolean,
  logger: Logger = {
    log(message) {
      console.log(message);
    },
  }
): Promise<string | undefined> {
  const { isEncapsulatedNx } = await nxWorkspace(workspacePath);
  const projectGraphOutput = await getProjectGraphOutput(workspacePath);

  return new Promise<string | undefined>((res, rej) => {
    const command = getNxExecutionCommand({
      cwd: workspacePath,
      displayCommand:
        `nx graph ${showAffected ? '--affected' : ''} --file ` +
        projectGraphOutput.relativePath,
      encapsulatedNx: isEncapsulatedNx,
    });

    logger.log(`Generating graph with command: \`${command}\``);
    try {
      execSync(command, {
        cwd: workspacePath,
        windowsHide: true,
        // Since this is going to be used within nxls, we need to make sure that stdio is set to ignore
        // The lsp is set up to write to the host on stdio, so if we pollute the stdio with data that is not
        // standard lsp, the connection will close because of malformed data.
        stdio: 'ignore',
      });

      res(undefined);
    } catch (e) {
      const errorMessage = `${e.output[1] || e}`;
      rej('Unable to create project graph: ' + errorMessage);
    }
  });
}
