import { CIPEInfo, CIPERun } from '@nx-console/shared-types';
import { isFailedStatus } from '@nx-console/shared-utils';
import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { commands, window } from 'vscode';

export function compareCIPEDataAndSendNotification(
  oldInfo: CIPEInfo[] | null,
  newInfo: CIPEInfo[],
) {
  const nxCloudNotificationsSetting = GlobalConfigurationStore.instance.get(
    'nxCloudNotifications',
  );

  if (nxCloudNotificationsSetting === 'none') {
    return;
  }

  // oldInfo is only null on the initial load
  // we don't know whether a cipe was actually just completed or if it's just being loaded for the first time
  // so we don't show any notifications on the initial load
  if (oldInfo === null) {
    return;
  }

  // Completed & Task Failed Notifications
  for (const newCIPE of newInfo) {
    const oldCIPE = oldInfo.find(
      (oldCIPE) =>
        newCIPE.ciPipelineExecutionId === oldCIPE.ciPipelineExecutionId,
    );

    // Check if aiTaskFix is newly available on any run
    const newCIPERuns =
      newCIPE.runGroups?.flatMap((runGroup) => runGroup.runs) || [];
    const oldCIPERuns =
      oldCIPE?.runGroups?.flatMap((runGroup) => runGroup.runs) || [];

    // Check if any run has an AI fix (for hiding "Help me fix this error")
    const hasAiTaskFix = newCIPERuns.some((run) => !!run.aiTaskFix);

    for (const newRun of newCIPERuns) {
      if (newRun.aiTaskFix?.suggestedFix) {
        const oldRun = oldCIPERuns.find(
          (run) =>
            run.linkId === newRun.linkId ||
            run.executionId === newRun.executionId,
        );
        if (!oldRun?.aiTaskFix?.suggestedFix) {
          showAiTaskFixNotification(newCIPE, newRun);
        }
      }
    }

    const newCipeIsSucceeded = newCIPE.status === 'SUCCEEDED';
    const newCIPEIsFailed = isFailedStatus(newCIPE.status);
    const newCIPEFailedRun = newCIPE.runGroups
      .flatMap((runGroup) => runGroup.runs)
      .find(
        (run) =>
          (run.status && isFailedStatus(run.status)) ||
          (run.numFailedTasks && run.numFailedTasks > 0),
      );

    const oldCIPEFailedRun = oldCIPE?.runGroups
      .flatMap((runGroup) => runGroup.runs)
      .find(
        (run) =>
          (run.status && isFailedStatus(run.status)) ||
          (run.numFailedTasks && run.numFailedTasks > 0),
      );

    // if the cipe has completed somehow or had a failed run before the latest update,
    // we've already shown a notification and can return
    if (oldCIPE && (oldCIPE.status !== 'IN_PROGRESS' || oldCIPEFailedRun)) {
      return;
    }

    if (newCIPEIsFailed) {
      showMessageWithResultAndCommit(
        `CI Pipeline Execution for #${newCIPE.branch} has completed`,
        newCIPE.cipeUrl,
        newCIPE.commitUrl,
        'error',
        hasAiTaskFix,
      );
    } else if (newCIPEFailedRun) {
      const command =
        newCIPEFailedRun.command.length > 70
          ? newCIPEFailedRun.command.substring(0, 60) + '[...]'
          : newCIPEFailedRun.command;
      showMessageWithResultAndCommit(
        `"${command}" has failed on #${newCIPE.branch}`,
        newCIPEFailedRun.runUrl,
        newCIPE.commitUrl,
        'error',
        hasAiTaskFix,
      );
    } else if (newCipeIsSucceeded && nxCloudNotificationsSetting === 'all') {
      showMessageWithResultAndCommit(
        `CI Pipeline Execution for #${newCIPE.branch} has completed`,
        newCIPE.cipeUrl,
        newCIPE.commitUrl,
        'information',
        hasAiTaskFix,
      );
    }
  }
}

function showMessageWithResultAndCommit(
  message: string,
  resultUrl: string,
  commitUrl: string | undefined | null,
  type: 'information' | 'error' = 'information',
  hasAiTaskFix = false,
) {
  const telemetry = getTelemetry();
  telemetry.logUsage('cloud.show-cipe-notification');
  const show =
    type === 'information'
      ? window.showInformationMessage
      : window.showErrorMessage;

  type MessageCommand =
    | 'View Results'
    | 'Help me fix this error'
    | 'View Commit';
  const messageCommands: MessageCommand[] = [];

  // Only show "Help me fix this error" if there's no AI task fix
  if (type === 'error' && !hasAiTaskFix) {
    messageCommands.push('Help me fix this error');
  }
  if (commitUrl) {
    messageCommands.push('View Commit');
  }

  messageCommands.push('View Results');

  // Update the message if AI fix is being created
  if (type === 'error' && hasAiTaskFix) {
    message = `${message} - Nx Cloud is creating a fix for this issue`;
  }

  const handleResults = async (selection: MessageCommand | undefined) => {
    if (selection === 'View Results') {
      telemetry.logUsage('cloud.view-cipe', {
        source: 'notification',
      });
      commands.executeCommand('vscode.open', resultUrl);
    } else if (selection === 'View Commit') {
      telemetry.logUsage('cloud.view-cipe-commit', {
        source: 'notification',
      });
      commands.executeCommand('vscode.open', commitUrl);
    } else if (selection === 'Help me fix this error') {
      telemetry.logUsage('cloud.fix-cipe-error', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.helpMeFixCipeError');
    }
  };

  show(message, ...messageCommands).then(handleResults);
}

function showAiTaskFixNotification(cipe: CIPEInfo, run: CIPERun) {
  const telemetry = getTelemetry();
  telemetry.logUsage('cloud.show-ai-task-fix-notification');

  type MessageCommand = 'Show Fix' | 'Apply Fix' | 'Ignore';
  const messageCommands: MessageCommand[] = ['Show Fix', 'Apply Fix', 'Ignore'];

  const handleResults = async (selection: MessageCommand | undefined) => {
    if (selection === 'Show Fix') {
      telemetry.logUsage('cloud.show-ai-task-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.showAiTaskFix', { cipe, run });
    } else if (selection === 'Apply Fix') {
      telemetry.logUsage('cloud.apply-ai-task-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.applyAiTaskFix', { cipe, run });
    } else if (selection === 'Ignore') {
      telemetry.logUsage('cloud.ignore-ai-task-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.ignoreAiTaskFix', { cipe, run });
    }
  };

  const commandDisplay =
    run.command.length > 40
      ? run.command.substring(0, 37) + '...'
      : run.command;

  window
    .showInformationMessage(
      `Nx Cloud suggested a fix for "${commandDisplay}" in #${cipe.branch}`,
      ...messageCommands,
    )
    .then(handleResults);
}
