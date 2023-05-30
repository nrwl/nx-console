import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { execSync } from 'child_process';

export async function isWorkingTreeClean(): Promise<
  { message: string; type: 'warning' | 'error' } | undefined
> {
  const { workspacePath } = await getNxWorkspace();
  try {
    execSync('git diff --quiet', {
      cwd: workspacePath,
    });
  } catch (e) {
    console.log(e);
    return {
      message:
        'You have uncommitted changes in your workspace. We recommend that you commit any previous changes before running a generator, so that you can easily undo changes if necessary.',
      type: 'warning',
    };
  }
  return undefined;
}
