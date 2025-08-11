import {
  commands,
  extensions,
  TextDocumentShowOptions,
  Uri,
  window,
} from 'vscode';
import { GitExtension } from './git';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { join } from 'path';
import { readMigrationsJsonMetadata } from '../commands/utils';
import type { MigrationDetailsWithId } from 'nx/src/config/misc-interfaces';
import { getGitApi, vscodeLogger } from '@nx-console/vscode-utils';

export async function viewPackageJsonDiff() {
  await viewDiff('package.json', 'HEAD');
}

export function viewDiffForMigration(
  path: string,
  migration: MigrationDetailsWithId,
) {
  const completedMigration =
    readMigrationsJsonMetadata()?.completedMigrations[migration.id];
  if (completedMigration.type === 'successful') {
    const toRef = completedMigration.ref;
    const fromRef = `${toRef}^1`;
    viewDiff(path, fromRef, toRef);
  }
}

export async function viewDiff(path: string, fromRef?: string, toRef?: string) {
  if (!fromRef) {
    fromRef = readMigrationsJsonMetadata()?.initialGitRef.ref;
  }

  const api = getGitApi();

  if (!api) {
    window.showErrorMessage(
      'Unable to utilize Git for this instance of VS Code',
    );
    return;
  }

  const fullPath = join(getNxWorkspacePath(), path);

  const toGitUri = toRef
    ? api.toGitUri(Uri.file(fullPath), toRef)
    : Uri.file(fullPath);

  const fromGitUri = api.toGitUri(toGitUri, fromRef);
  commands.executeCommand('vscode.diff', fromGitUri, toGitUri, null, {
    preview: true,
    preserveFocus: true,
  } as TextDocumentShowOptions);

  commands.executeCommand('nxMigrate.focus');
}
