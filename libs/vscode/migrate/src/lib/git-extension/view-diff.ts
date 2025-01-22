import { commands, extensions, TextDocumentShowOptions, Uri } from 'vscode';
import { GitExtension } from './git';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { join } from 'path';
import { readMigrationsJsonMetadata } from '../commands/utils';

export async function viewPackageJsonDiff() {
  await viewDiff('package.json', 'HEAD');
}

export async function viewDiff(path: string, ref?: string) {
  if (!ref) {
    ref = readMigrationsJsonMetadata().initialGitRef.ref;
  }
  const gitExtension =
    extensions.getExtension<GitExtension>('vscode.git').exports;
  const api = gitExtension.getAPI(1);

  const fullPath = join(getNxWorkspacePath(), path);
  const uri = Uri.file(fullPath);

  const gitUri = api.toGitUri(uri, ref);
  commands.executeCommand('vscode.diff', gitUri, uri, null, {
    preview: true,
    preserveFocus: true,
  } as TextDocumentShowOptions);

  commands.executeCommand('nxMigrate.focus');
}
