import { CIPEInfo, CIPERunGroup } from '@nx-console/shared-types';
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

    // Check if aiFix is newly available on any runGroup
    const newCIPERunGroups = newCIPE.runGroups || [];
    const oldCIPERunGroups = oldCIPE?.runGroups || [];

    // Check if any runGroup has an AI fix (to skip failure notifications)
    const hasAiFix = newCIPERunGroups.some((runGroup) => !!runGroup.aiFix);

    for (const newRunGroup of newCIPERunGroups) {
      if (newRunGroup.aiFix?.suggestedFix) {
        const oldRunGroup = oldCIPERunGroups.find(
          (runGroup) => runGroup.runGroup === newRunGroup.runGroup,
        );
        if (!oldRunGroup?.aiFix?.suggestedFix) {
          showAiFixNotification(newCIPE, newRunGroup);
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

    if (newCIPEIsFailed && !hasAiFix) {
      showMessageWithResultAndCommit(
        `CI Pipeline Execution for #${newCIPE.branch} has failed`,
        newCIPE.cipeUrl,
        newCIPE.commitUrl,
        'error',
      );
    } else if (newCIPEFailedRun && !hasAiFix) {
      const command =
        newCIPEFailedRun.command.length > 70
          ? newCIPEFailedRun.command.substring(0, 60) + '[...]'
          : newCIPEFailedRun.command;
      showMessageWithResultAndCommit(
        `"${command}" has failed on #${newCIPE.branch}`,
        newCIPEFailedRun.runUrl,
        newCIPE.commitUrl,
        'error',
      );
    } else if (newCipeIsSucceeded && nxCloudNotificationsSetting === 'all') {
      showMessageWithResultAndCommit(
        `CI Pipeline Execution for #${newCIPE.branch} has completed`,
        newCIPE.cipeUrl,
        newCIPE.commitUrl,
        'information',
      );
    }
  }
}

function showMessageWithResultAndCommit(
  message: string,
  resultUrl: string,
  commitUrl: string | undefined | null,
  type: 'information' | 'error' = 'information',
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

  if (type === 'error') {
    messageCommands.push('Help me fix this error');
  }
  if (commitUrl) {
    messageCommands.push('View Commit');
  }

  messageCommands.push('View Results');

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

function showAiFixNotification(cipe: CIPEInfo, runGroup: CIPERunGroup) {
  const telemetry = getTelemetry();
  telemetry.logUsage('cloud.show-ai-fix-notification');

  type MessageCommand = 'Show Fix' | 'Apply Fix' | 'Ignore';
  const messageCommands: MessageCommand[] = ['Show Fix', 'Apply Fix', 'Ignore'];

  const handleResults = async (selection: MessageCommand | undefined) => {
    if (selection === 'Show Fix') {
      telemetry.logUsage('cloud.show-ai-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.showAiFix', { cipe, runGroup });
    } else if (selection === 'Apply Fix') {
      telemetry.logUsage('cloud.apply-ai-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.applyAiFix', { cipe, runGroup });
    } else if (selection === 'Ignore') {
      telemetry.logUsage('cloud.ignore-ai-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.ignoreAiFix', { cipe, runGroup });
    }
  };

  const taskDisplay = runGroup.aiFix?.taskIds[0];
  window
    .showInformationMessage(
      `Nx Cloud suggested a fix for ${taskDisplay} in #${cipe.branch}`,
      ...messageCommands,
    )
    .then(handleResults);
}
