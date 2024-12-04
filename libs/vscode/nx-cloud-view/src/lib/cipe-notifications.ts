import { CIPEInfo } from '@nx-console/shared/types';
import { isFailedStatus } from '@nx-console/shared/utils';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode/configuration';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { execSync } from 'child_process';
import { commands, window } from 'vscode';

export function compareCIPEDataAndSendNotification(
  oldInfo: CIPEInfo[] | null,
  newInfo: CIPEInfo[]
) {
  const nxCloudNotificationsSetting = GlobalConfigurationStore.instance.get(
    'nxCloudNotifications'
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
  newInfo.forEach((newCIPE) => {
    if (newCIPE.branch === getDefaultBranch()) {
      return;
    }
    const oldCIPE = oldInfo.find(
      (oldCIPE) =>
        newCIPE.ciPipelineExecutionId === oldCIPE.ciPipelineExecutionId
    );

    const newCipeIsSucceeded = newCIPE.status === 'SUCCEEDED';
    const newCIPEIsFailed = isFailedStatus(newCIPE.status);
    const newCIPEFailedRun = newCIPE.runGroups
      .flatMap((runGroup) => runGroup.runs)
      .find(
        (run) =>
          (run.status && isFailedStatus(run.status)) ||
          (run.numFailedTasks && run.numFailedTasks > 0)
      );

    const oldCIPEFailedRun = oldCIPE?.runGroups
      .flatMap((runGroup) => runGroup.runs)
      .find(
        (run) =>
          (run.status && isFailedStatus(run.status)) ||
          (run.numFailedTasks && run.numFailedTasks > 0)
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
        'error'
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
        'error'
      );
    } else if (newCipeIsSucceeded && nxCloudNotificationsSetting === 'all') {
      showMessageWithResultAndCommit(
        `CI Pipeline Execution for #${newCIPE.branch} has completed`,
        newCIPE.cipeUrl,
        newCIPE.commitUrl
      );
    }
  });
}

function showMessageWithResultAndCommit(
  message: string,
  resultUrl: string,
  commitUrl: string | undefined | null,
  type: 'information' | 'error' = 'information'
) {
  const telemetry = getTelemetry();
  telemetry.logUsage('cloud.show-cipe-notification');
  const show =
    type === 'information'
      ? window.showInformationMessage
      : window.showErrorMessage;

  const handleResults = (
    selection: 'View Results' | 'View Commit' | undefined
  ) => {
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
    }
  };
  if (commitUrl) {
    show(message, 'View Results', 'View Commit').then(handleResults);
  } else {
    show(message, 'View Results').then(handleResults);
  }
}

export function getDefaultBranch() {
  try {
    const remoteHeadRef = execSync(
      'git symbolic-ref refs/remotes/origin/HEAD',
      {
        cwd: getNxWorkspacePath(),
      }
    )
      .toString()
      .trim();
    return remoteHeadRef.replace('refs/remotes/origin/', '');
  } catch (e) {
    return 'main';
  }
}
