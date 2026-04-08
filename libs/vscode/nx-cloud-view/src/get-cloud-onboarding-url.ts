import {
  buildSafeDlxCommand,
  getPackageManagerCommand,
} from '@nx-console/shared-npm';
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
  const provenanceResult = await nxLatestProvenanceCheck(workspacePath);
  if (provenanceResult !== true) {
    getTelemetry().logUsage('misc.nx-latest-no-provenance');
    vscodeLogger.log(provenanceResult);
    throw new Error(noProvenanceError);
  }

  const { prefix, env } = buildSafeDlxCommand(packageManagerCommand.dlx);
  const command = `${prefix} nx@latest connect`;
  const nxConnectOutput = execSync(command, {
    cwd: workspacePath,
    env: { ...process.env, ...env },
  });
  const match = nxConnectOutput.toString().match(/(https:\/\/\S+)/);
  return match ? match[1] : undefined;
}
