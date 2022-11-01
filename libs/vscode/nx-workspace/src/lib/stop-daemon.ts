import { getPackageManagerCommand } from '@nrwl/devkit';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { exec } from 'child_process';
import { promisify } from 'util';

export async function stopDaemon() {
  return promisify(exec)(
    `${getPackageManagerCommand().exec} nx daemon --stop`,
    {
      cwd: getWorkspacePath(),
    }
  ).catch((e) => {
    console.log(e);
  });
}
