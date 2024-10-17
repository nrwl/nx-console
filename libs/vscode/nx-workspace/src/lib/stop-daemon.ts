import { importNxPackagePath } from '@nx-console/shared/npm';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { appendFileSync } from 'fs';

export async function stopDaemon() {
  const workspacePath = getWorkspacePath();

  const { daemonClient } = await importNxPackagePath<
    typeof import('nx/src/daemon/client/client')
  >(workspacePath, 'src/daemon/client/client');

  await daemonClient.stop();
}
