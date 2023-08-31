import { NxWorkspace } from '@nx-console/shared/types';
import { StartupMessageDefinition } from '../nx-console-plugin-types';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { promisify } from 'util';
import { exec } from 'child_process';

export async function gitCleanMessageFactory(
  _: GeneratorSchema,
  workspace: NxWorkspace
): Promise<StartupMessageDefinition | undefined> {
  const workspacePath = workspace.workspacePath;
  try {
    await promisify(exec)('git diff --quiet', {
      cwd: workspacePath,
      windowsHide: true,
    });
  } catch (e) {
    return {
      message:
        'You have uncommitted changes in your workspace. We recommend that you commit any previous changes before running a generator, so that you can easily undo changes if necessary.',
      type: 'warning',
    };
  }
  return undefined;
}
