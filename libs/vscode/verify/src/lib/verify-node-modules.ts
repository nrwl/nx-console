import { directoryExists } from '@nx-console/server';

import { join } from 'path';
import { window } from 'vscode';

export async function verifyNodeModules(workspacePath: string): Promise<{
  validNodeModules: boolean;
}> {
  if (!(await directoryExists(join(workspacePath, 'node_modules')))) {
    window.showErrorMessage(
      'Could not execute task since node_modules directory is missing. Run npm install at: ' +
        workspacePath
    );
    return { validNodeModules: false };
  }

  return { validNodeModules: true };
}
