import { getNxExecutionCommand } from '@nx-console/shared-npm';
import { runManagedCommand } from '@nx-console/shared-utils';
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
  }).then(async (command) => {
    lspLogger.log(`Generating graph with command: \`${command}\``);
    try {
      await runManagedCommand(command, {
        cwd: workspacePath,
        timeoutMs: 10 * 60_000,
      });

      return undefined;
    } catch (e) {
      const errorMessage = `${e.stdout || e}`;
      throw 'Unable to create project graph: ' + errorMessage;
    }
  });
}
