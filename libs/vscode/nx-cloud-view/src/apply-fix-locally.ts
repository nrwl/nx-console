import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { ShellQuoting, Task, TaskScope, window } from 'vscode';

import { tasks } from 'vscode';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import {
  getGitRepository,
  getShellExecutionForConfig,
} from '@nx-console/vscode-utils';
import { getAiFixStatusBarService } from './ai-fix-status-bar-service';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFile, unlink } from 'fs/promises';

/**
 * Apply an Nx Cloud fix locally using Git, this is a fallback if the aiFix shortlinkId is not available
 *
 * @param suggestedFix The patch content to apply
 * @returns
 */
export async function applyFixLocallyWithGit(
  suggestedFix: string,
): Promise<void> {
  const repo = getGitRepository();
  if (!repo) {
    window.showErrorMessage('No Git repository found');
    return;
  }

  try {
    const tempFilePath = join(tmpdir(), `nx-cloud-fix-${Date.now()}.patch`);

    try {
      if (suggestedFix.lastIndexOf('\n') !== suggestedFix.length - 1) {
        // Ensure the suggested fix ends with a newline
        suggestedFix += '\n';
      }

      await writeFile(tempFilePath, suggestedFix);
      await repo.apply(tempFilePath);
    } finally {
      await unlink(tempFilePath);
    }

    window.showInformationMessage(
      'Nx Cloud fix applied locally. Please review and modify any changes before committing.',
    );

    getAiFixStatusBarService().hideAiFixStatusBarItem();
  } catch (error) {
    vscodeLogger.log(
      `Failed to apply Nx Cloud fix locally: ${error.stderr || error.message}`,
    );
    window.showErrorMessage(
      'Failed to apply Nx Cloud fix locally. Please check the output for more details.',
    );
    return;
  }
}

// Fix ids are Nx Cloud short links (`<fix>-<suggestion>`). Only allow characters that no shell treats specially.
const FIX_ID_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;

export function isValidFixId(fixId: unknown): fixId is string {
  return typeof fixId === 'string' && FIX_ID_PATTERN.test(fixId);
}

/**
 * Apply an Nx Cloud fix locally using the nx-cloud CLI with VSCode UI feedback
 * @param fixId The fix ID to apply
 * @param workspacePath Optional workspace path, defaults to current workspace
 * @returns Promise<boolean> indicating success or failure
 */
export async function applyFixLocallyWithNxCloud(fixId: string): Promise<void> {
  if (!isValidFixId(fixId)) {
    vscodeLogger.log(
      `Refusing to apply Nx Cloud fix with invalid id: ${fixId}`,
    );
    window.showErrorMessage('Failed to apply fix: invalid Nx Cloud fix id.');
    return;
  }

  vscodeLogger.log(`Applying Nx Cloud fix: ${fixId}`);

  try {
    const success = await runApplyLocallyCommand(fixId);

    if (success) {
      vscodeLogger.log(`Successfully applied fix: ${fixId}`);
      getAiFixStatusBarService().hideAiFixStatusBarItem();
    } else {
      vscodeLogger.log(`Failed to apply fix ${fixId}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscodeLogger.log(`Error applying fix: ${message}`);
    window.showErrorMessage(`Failed to apply fix: ${message}`);
  }
}

async function runApplyLocallyCommand(fixId: string): Promise<boolean> {
  try {
    const { isEncapsulatedNx, workspacePath } = await getNxWorkspace();

    const command = 'nx-cloud apply-locally';
    const label = `${command} ${fixId}`;
    const task = new Task(
      {
        type: 'shell',
        command: label,
        options: {
          cwd: workspacePath,
        },
      },
      TaskScope.Workspace, // scope
      label,
      'nx', // source
      await getShellExecutionForConfig({
        displayCommand: command,
        cwd: workspacePath,
        encapsulatedNx: isEncapsulatedNx,
        workspacePath,
        args: [{ value: fixId, quoting: ShellQuoting.Strong }],
      }),
    );

    if (!task) {
      throw new Error('Failed to create nx-cloud task');
    }

    return new Promise<boolean>((resolve) => {
      const disposable = tasks.onDidEndTaskProcess(async (e) => {
        if (e.execution.task === task) {
          disposable.dispose();
          resolve(e.exitCode === 0);
        }
      });

      tasks.executeTask(task);
    });
  } catch (error) {
    return false;
  }
}
