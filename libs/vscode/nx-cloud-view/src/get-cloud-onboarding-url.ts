import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { execSync } from 'child_process';

export async function getCloudOnboardingUrl() {
  const workspacePath = getNxWorkspacePath();
  const packageManagerCommand = getPackageManagerCommand(workspacePath);
  const nxConnectOutput = execSync(
    `${(await packageManagerCommand).dlx} nx@latest connect`,
    {
      cwd: workspacePath,
    },
  );
  const match = nxConnectOutput.toString().match(/(https:\/\/\S+)/);
  return match ? match[1] : undefined;
}
