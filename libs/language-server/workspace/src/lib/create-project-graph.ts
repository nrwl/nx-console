import { getNxExecutionCommand } from '@nx-console/shared-npm';

import { execSync } from 'child_process';
import { getProjectGraphOutput } from './get-project-graph-output';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';

export async function createProjectGraph(
  workspacePath: string,
  showAffected: boolean,
): Promise<string | undefined> {
  const { isEncapsulatedNx } = await nxWorkspace(workspacePath, lspLogger);
  const projectGraphOutput = await getProjectGraphOutput(workspacePath);

  return getNxExecutionCommand({
    cwd: workspacePath,
    displayCommand:
      `nx graph ${showAffected ? '--affected' : ''} --file ` +
      projectGraphOutput.relativePath,
    encapsulatedNx: isEncapsulatedNx,
  }).then((command) => {
    lspLogger.log(`Generating graph with command: \`${command}\``);
    try {
      execSync(command, {
        cwd: workspacePath,
        windowsHide: true,
        // Since this is going to be used within nxls, we need to make sure that stdio is set to ignore
        // The lsp is set up to write to the host on stdio, so if we pollute the stdio with data that is not
        // standard lsp, the connection will close because of malformed data.
        stdio: 'ignore',
      });

      return undefined;
    } catch (e) {
      const errorMessage = `${e.output[1] || e}`;
      throw 'Unable to create project graph: ' + errorMessage;
    }
  });
}
