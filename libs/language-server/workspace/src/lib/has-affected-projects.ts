import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { getNxExecutionCommand } from '@nx-console/shared-npm';
import { Logger, runManagedCommand } from '@nx-console/shared-utils';
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
  const { stdout } = await runManagedCommand(command, {
    cwd: workspacePath,
    timeoutMs: 5 * 60_000,
  });

  return stdout.trim().length > 0;
}
