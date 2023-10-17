import { execSync } from 'child_process';
import { nxWorkspace } from './workspace';
import { getNxExecutionCommand } from '@nx-console/shared/utils';
import { Logger } from '@nx-console/shared/schema';

export async function hasAffectedProjects(
  workspacePath: string,
  _: Logger
): Promise<boolean> {
  const { isEncapsulatedNx } = await nxWorkspace(workspacePath);

  const command = getNxExecutionCommand({
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
