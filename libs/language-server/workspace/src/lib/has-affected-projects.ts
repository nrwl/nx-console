import { execSync } from 'child_process';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { getNxExecutionCommand } from '@nx-console/shared-npm';
import { Logger } from '@nx-console/shared-utils';
import { lspLogger } from '@nx-console/language-server-utils';

export async function hasAffectedProjects(
  workspacePath: string,
  _: Logger,
): Promise<boolean> {
  const { isEncapsulatedNx } = await nxWorkspace(workspacePath, lspLogger);

  const command = await getNxExecutionCommand({
    cwd: workspacePath,
    displayCommand: `nx show projects --affected`,
    encapsulatedNx: isEncapsulatedNx,
  });
  const output = execSync(command, {
    cwd: workspacePath,
    windowsHide: true,
    stdio: 'pipe',
  });

  return output.toString().trim().length > 0;
}
