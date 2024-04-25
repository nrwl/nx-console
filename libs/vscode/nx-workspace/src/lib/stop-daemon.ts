import { importNxPackagePath } from '@nx-console/shared/npm';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { exec } from 'child_process';
import { promisify } from 'util';

export async function stopDaemon() {
  const workspacePath = getWorkspacePath();
  const { getPackageManagerCommand } = await importNxPackagePath<
    typeof import('nx/src/devkit-exports')
  >(workspacePath, 'src/devkit-exports');

  return promisify(exec)(
    `${getPackageManagerCommand().exec} nx daemon --stop`,
    {
      cwd: workspacePath,
    }
  ).catch((e) => {
    console.log(e);
  });
}
