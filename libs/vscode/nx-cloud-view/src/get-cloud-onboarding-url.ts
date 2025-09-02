import { getPackageManagerCommand } from '@nx-console/shared-npm';
import {
  noProvenanceError,
  nxLatestProvenanceCheck,
} from '@nx-console/shared-utils';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { execSync } from 'child_process';

export async function getCloudOnboardingUrl() {
  const workspacePath = getNxWorkspacePath();
  const packageManagerCommand = await getPackageManagerCommand(workspacePath);
  const provenanceResult = await nxLatestProvenanceCheck();
  if (provenanceResult !== true) {
    getTelemetry().logUsage('misc.nx-latest-no-provenance');
    vscodeLogger.log(provenanceResult);
    throw new Error(noProvenanceError);
  }
  const nxConnectOutput = execSync(
    `${packageManagerCommand.dlx} ${packageManagerCommand.dlx === 'npx' ? '-y' : ''} nx@latest connect --ignore-scripts`,
    {
      cwd: workspacePath,
    },
  );
  const match = nxConnectOutput.toString().match(/(https:\/\/\S+)/);
  return match ? match[1] : undefined;
}
