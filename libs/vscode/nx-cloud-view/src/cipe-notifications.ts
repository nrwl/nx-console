import { CIPEInfo, CIPERunGroup } from '@nx-console/shared-types';
import { isFailedStatus } from '@nx-console/shared-utils';
import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { commands, window, StatusBarItem, StatusBarAlignment } from 'vscode';

let aiFixStatusBarItem: StatusBarItem | undefined;

export function compareCIPEDataAndSendNotification(
  oldInfo: CIPEInfo[] | null,
  newInfo: CIPEInfo[],
) {
  // Always update status bar
  updateAiFixStatusBar(newInfo);

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

    // Check if any runGroup has an AI fix or could get one in the future (to skip failure notifications)
    const hasRunGroupWithAiFix = newCIPERunGroups.some(
      (runGroup) => !!runGroup.aiFix,
    );
    const failedButNoAiFixInFiveMinutes =
      newCIPE.status === 'FAILED' &&
      !hasRunGroupWithAiFix &&
      newCIPE.completedAt &&
      newCIPE.completedAt + 1000 * 60 * 5 < Date.now();

    const potentiallyHasAiFix =
      hasRunGroupWithAiFix ||
      (newCIPE.aiFixesEnabled && !failedButNoAiFixInFiveMinutes);

    for (const newRunGroup of newCIPERunGroups) {
      if (
        newRunGroup.aiFix?.suggestedFix &&
        newRunGroup.aiFix.suggestedFixStatus !== 'NOT_STARTED'
      ) {
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
    // the one exception is if we supressed the notification because we thought an AI fix might be coming
    // and now we know no AI fix is coming after 5 minutes AND we haven't shown this delayed notification yet
    const oldPotentiallyHasAiFix =
      (oldCIPE?.runGroups || []).some((runGroup) => !!runGroup.aiFix) ||
      (oldCIPE?.aiFixesEnabled &&
        oldCIPE.status === 'FAILED' &&
        oldCIPE.completedAt &&
        oldCIPE.completedAt + 1000 * 60 * 5 >= Date.now());

    const isDelayedNotificationTransition =
      oldPotentiallyHasAiFix &&
      !potentiallyHasAiFix &&
      failedButNoAiFixInFiveMinutes;

    const shouldSkipDueToCompletedCIPE =
      oldCIPE &&
      (oldCIPE.status !== 'IN_PROGRESS' || oldCIPEFailedRun) &&
      !isDelayedNotificationTransition;

    if (shouldSkipDueToCompletedCIPE) {
      continue;
    }

    if (newCIPEIsFailed && !potentiallyHasAiFix) {
      showMessageWithResultAndCommit(
        `CI failed for #${newCIPE.branch}.`,
        newCIPE.cipeUrl,
        newCIPE.commitUrl,
        'error',
      );
    } else if (newCIPEFailedRun && !potentiallyHasAiFix) {
      const command =
        newCIPEFailedRun.command.length > 70
          ? newCIPEFailedRun.command.substring(0, 60) + '[...]'
          : newCIPEFailedRun.command;
      showMessageWithResultAndCommit(
        `"${command}" failed on #${newCIPE.branch}.`,
        newCIPEFailedRun.runUrl,
        newCIPE.commitUrl,
        'error',
      );
    } else if (newCipeIsSucceeded && nxCloudNotificationsSetting === 'all') {
      showMessageWithResultAndCommit(
        `CI succeeded for #${newCIPE.branch}.`,
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

  type MessageCommand = 'Show Fix' | 'Reject';
  const messageCommands: MessageCommand[] = ['Show Fix', 'Reject'];

  const handleResults = async (selection: MessageCommand | undefined) => {
    if (selection === 'Show Fix') {
      telemetry.logUsage('cloud.show-ai-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.openFixDetails', {
        cipeId: cipe.ciPipelineExecutionId,
        runGroupId: runGroup.runGroup,
      });
    } else if (selection === 'Reject') {
      telemetry.logUsage('cloud.reject-ai-fix', {
        source: 'notification',
      });
      commands.executeCommand('nxCloud.rejectAiFix', { cipe, runGroup });
    }
  };

  const message = getAIFixMessage(cipe.branch);

  window.showErrorMessage(message, ...messageCommands).then(handleResults);
}

export function disposeAiFixStatusBarItem() {
  if (aiFixStatusBarItem) {
    aiFixStatusBarItem.dispose();
    aiFixStatusBarItem = undefined;
  }
}

export function hideAiFixStatusBarItem() {
  if (aiFixStatusBarItem) {
    aiFixStatusBarItem.hide();
  }
}

export function updateAiFixStatusBar(cipeData: CIPEInfo[]) {
  let foundFix: { cipe: CIPEInfo; runGroup: CIPERunGroup } | null = null;

  for (const cipe of cipeData) {
    for (const runGroup of cipe.runGroups || []) {
      if (
        runGroup.aiFix?.suggestedFix &&
        runGroup.aiFix.userAction === 'NONE'
      ) {
        foundFix = { cipe, runGroup };
        break;
      }
    }
    if (foundFix) break;
  }

  if (foundFix) {
    if (!aiFixStatusBarItem) {
      aiFixStatusBarItem = window.createStatusBarItem(
        StatusBarAlignment.Left,
        100,
      );
    }

    const message = getAIFixMessage(foundFix.cipe.branch);

    aiFixStatusBarItem.text = `$(wrench) Nx Cloud AI Fix`;
    aiFixStatusBarItem.tooltip = message;
    aiFixStatusBarItem.command = {
      command: 'nxCloud.openFixDetails',
      title: 'Show Error Details',
      arguments: [
        {
          cipeId: foundFix.cipe.ciPipelineExecutionId,
          runGroupId: foundFix.runGroup.runGroup,
        },
      ],
    };
    aiFixStatusBarItem.show();
  } else {
    // Hide status bar if no fixes available
    hideAiFixStatusBarItem();
  }
}

function getAIFixMessage(branch: string) {
  return `CI failed. Nx Cloud AI has a fix for #${branch}`;
}
