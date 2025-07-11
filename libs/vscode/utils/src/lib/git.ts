import { extensions, Uri } from 'vscode';
import type { GitExtension, API, Repository } from './git-extension';
import { getWorkspacePath } from './get-workspace-path';

export function getGitApi(): API | undefined {
  const gitExt = extensions.getExtension<GitExtension>('vscode.git').exports;
  const api = gitExt.getAPI(1);
  if (!api) {
    return undefined;
  }
  return api;
}

export function getGitRepository(): Repository | undefined {
  const git = getGitApi();
  if (!git) {
    return undefined;
  }
  return git.getRepository(Uri.file(getWorkspacePath()));
}

export async function getGitBranch(): Promise<string | undefined> {
  const repo = getGitRepository();
  if (!repo) {
    return undefined;
  }
  return repo.state.HEAD.name;
}

export async function getGitHasUncommittedChanges(): Promise<boolean> {
  const repo = getGitRepository();
  if (!repo) {
    return false;
  }
  const s = repo.state;

  return Boolean(
    s.mergeChanges.length || // merge or conflict in progress
      s.indexChanges.length || // staged but un-committed
      s.workingTreeChanges.length || // modified / deleted / renamed files
      s.untrackedChanges.length, // new, un-tracked files
  );
}

export async function getGitDiffs(
  workspaceRoot: string,
  baseSha?: string,
  headSha?: string,
): Promise<{ path: string; diffContent: string }[] | null> {
  const git = getGitApi();

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

  const changedFiles = (await repo.diffBetween(base, head)).map(
    (changedFile) => {
      return {
        value: changedFile.uri,
      };
    },
  );

  const fileDiffs = await Promise.all(
    changedFiles.map(async (file) => {
      const fileDiff = await repo.diffBetween(base, head, file.value.fsPath);
      return {
        path: file.value.fsPath,
        diffContent: fileDiff,
      };
    }),
  );

  return fileDiffs.filter((fileDiff) => fileDiff !== null);
}
