import { NxError } from '@nx-console/shared-types';
import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { Uri } from 'vscode';

export function getUriForError(error: NxError, workspacePath: string): Uri {
  if (error.file) {
    const filePath = isAbsolute(error.file)
      ? error.file
      : join(workspacePath, error.file);
    return Uri.file(filePath);
  }

  if (error.pluginRoot) {
    const pluginPath = join(workspacePath, error.pluginRoot);
    if (existsSync(pluginPath)) {
      return Uri.file(pluginPath);
    }
  }

  const nxJsonPath = join(workspacePath, 'nx.json');
  if (existsSync(nxJsonPath)) {
    return Uri.file(nxJsonPath);
  }

  const lernaJsonPath = join(workspacePath, 'lerna.json');
  if (existsSync(lernaJsonPath)) {
    return Uri.file(lernaJsonPath);
  }

  return Uri.file(workspacePath || '.');
}
