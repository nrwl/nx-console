import { existsSync } from 'fs';
import { join } from 'path';
import { window } from 'vscode';

export function verifyNodeModules(
  workspacePath: string
): { validNodeModules: boolean } {
  if (!existsSync(join(workspacePath, 'node_modules'))) {
    window.showErrorMessage(
      'Could not execute task since node_modules directory is missing. Run npm install at: ' +
        workspacePath
    );
    return { validNodeModules: false };
  }

  return { validNodeModules: true };
}
