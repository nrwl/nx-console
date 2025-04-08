import { extensions, Uri } from 'vscode';
import { GitExtension } from './git-extension';

export async function getGitDiffs(
  workspaceRoot: string,
  baseSha?: string,
  headSha?: string,
): Promise<{ path: string; diffContent: string }[] | null> {
  const git = await extensions
    .getExtension<GitExtension>('vscode.git')
    ?.exports.getAPI(1);

  if (!git) {
    return null;
  }

  const repo = git.getRepository(Uri.file(workspaceRoot));

  if (!repo) {
    return null;
  }

  const base =
    baseSha ??
    (
      await repo.getCommit(
        (await repo.getBranchBase(repo.state.HEAD.name))?.name,
      )
    ).hash;
  const head = headSha ?? (await repo.getCommit(repo.state.HEAD.name)).hash;
  const fileDiffs = await Promise.all(
    (await repo.diffBetween(base, head)).map(async (changedFile) => {
      const fileDiff = await repo.diffBetween(
        base,
        head,
        changedFile.uri.fsPath,
      );
      return {
        path: changedFile.uri.fsPath,
        diffContent: fileDiff,
      };
    }),
  );

  return fileDiffs;
}
