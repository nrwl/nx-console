import {
  detectPackageManager,
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
  const packageManager = await detectPackageManager(
    workspacePath,
    vscodeLogger,
  );
  const packageManagerCommand = await getPackageManagerCommand(workspacePath);
  const provenanceResult = await nxLatestProvenanceCheck();
  if (provenanceResult !== true) {
    getTelemetry().logUsage('misc.nx-latest-no-provenance');
    vscodeLogger.log(provenanceResult);
    throw new Error(noProvenanceError);
  }

  // newer versions of nx will add `--ignore-scripts` by default, but older versions may not
  // yarn is not compatible with `--ignore-scripts` so we skip it for yarn
  let command = `${packageManagerCommand.dlx} ${packageManagerCommand.dlx === 'npx' ? '-y' : ''} nx@latest connect --ignore-scripts`;
  if (!command.includes('--ignore-scripts') && packageManager !== 'yarn') {
    command += ' --ignore-scripts';
  }
  const nxConnectOutput = execSync(command, {
    cwd: workspacePath,
  });
  const match = nxConnectOutput.toString().match(/(https:\/\/\S+)/);
  return match ? match[1] : undefined;
}
