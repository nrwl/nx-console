import { NxError } from '@nx-console/shared-types';
import { existsSync } from 'fs';
import { join } from 'path';
import { Uri } from 'vscode';

export function getUriForError(error: NxError, workspacePath: string): Uri {
  if (error.file) {
    return Uri.file(join(workspacePath, error.file));
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
