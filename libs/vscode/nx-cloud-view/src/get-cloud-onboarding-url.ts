import { getPackageManagerCommand } from '@nx-console/shared-npm';
import {
  noProvenanceError,
  nxLatestHasProvenance,
} from '@nx-console/shared-utils';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { execSync } from 'child_process';

export async function getCloudOnboardingUrl() {
  const workspacePath = getNxWorkspacePath();
  const packageManagerCommand = await getPackageManagerCommand(workspacePath);
  const hasProvenance = nxLatestHasProvenance();
  if (!hasProvenance) {
    getTelemetry().logUsage('cli.init.nx-latest-no-provenance');
    throw new Error(noProvenanceError);
  }
  const nxConnectOutput = execSync(
    `${packageManagerCommand.dlx} ${packageManagerCommand.dlx === 'npx' ? '-y' : ''} nx@latest connect`,
    {
      cwd: workspacePath,
    },
  );
  const match = nxConnectOutput.toString().match(/(https:\/\/\S+)/);
  return match ? match[1] : undefined;
}
