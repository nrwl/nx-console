import { CIPEInfo, CIPERun, CIPERunGroup } from '@nx-console/shared-types';
import { isFailedStatus } from '@nx-console/shared-utils';
import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { commands, window, StatusBarItem, StatusBarAlignment } from 'vscode';

let aiFixStatusBarItem: StatusBarItem | undefined;

export class CIPENotificationService {
  private sentNotifications = new Set<string>();

  private nxCloudNotificationsSetting: 'all' | 'errors' | 'none';

  constructor() {
    this.nxCloudNotificationsSetting = GlobalConfigurationStore.instance.get(
      'nxCloudNotifications',
    );
  }

  compareCIPEDataAndSendNotifications(
    oldInfo: CIPEInfo[] | null,
    newInfo: CIPEInfo[],
  ) {
    // Always update status bar first
    updateAiFixStatusBar(newInfo);

    this.nxCloudNotificationsSetting = GlobalConfigurationStore.instance.get(
      'nxCloudNotifications',
    );

    // Early return if notifications are disabled
    if (this.nxCloudNotificationsSetting === 'none') {
      return;
    }

    // Skip notifications on initial load since we don't know if CIPEs
    // just completed or are just being loaded for the first time
    if (oldInfo === null) {
      return;
    }

    // Process each CIPE for potential notifications
    for (const newCIPE of newInfo) {
      const cipeId = newCIPE.ciPipelineExecutionId;
      // Find the corresponding old CIPE if it exists
      if (this.sentNotifications.has(cipeId)) {
        continue;
      }
      const oldCIPE = oldInfo.find(
        (old) => old.ciPipelineExecutionId === cipeId,
      );
      this.processCIPENotifications(oldCIPE, newCIPE);
      //   const cipeId = newCIPE.ciPipelineExecutionId;
      //   if (!this.sentNotifications.has(cipeId)) {
      //     this.processCIPENotifications(newCIPE);
      //   }
    }
  }

  private showCommandFailureNotification(cipe: CIPEInfo, failedRun: CIPERun) {
    if (this.sentNotifications.has(cipe.ciPipelineExecutionId)) {
      return;
    }
    this.sentNotifications.add(cipe.ciPipelineExecutionId);
    const command = truncateCommand(failedRun.command);
    showMessageWithResultAndCommit(
      `"${command}" failed on #${cipe.branch}.`,
      failedRun.runUrl,
      cipe.commitUrl,
      'error',
    );
  }

  private showCIPEFailureNotification(cipe: CIPEInfo) {
    if (this.sentNotifications.has(cipe.ciPipelineExecutionId)) {
      return;
    }
    this.sentNotifications.add(cipe.ciPipelineExecutionId);
    showMessageWithResultAndCommit(
      `CI failed for #${cipe.branch}.`,
      cipe.cipeUrl,
      cipe.commitUrl,
      'error',
    );
  }

  private showCIPESuccessNotification(cipe: CIPEInfo) {
    if (this.sentNotifications.has(cipe.ciPipelineExecutionId)) {
      return;
    }
    this.sentNotifications.add(cipe.ciPipelineExecutionId);
    showMessageWithResultAndCommit(
      `CI succeeded for #${cipe.branch}.`,
      cipe.cipeUrl,
      cipe.commitUrl,
      'information',
    );
  }

  private showAiFixNotification(cipe: CIPEInfo, runGroup: CIPERunGroup) {
    if (this.sentNotifications.has(cipe.ciPipelineExecutionId)) {
      return;
    }
    this.sentNotifications.add(cipe.ciPipelineExecutionId);
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

  private processCIPENotifications(
    oldCIPE: CIPEInfo | undefined,
    newCIPE: CIPEInfo,
  ) {
    // AI fix notifications
    if (oldCIPE) {
      const newAiFixes = findNewAiFixes(
        newCIPE.runGroups || [],
        oldCIPE.runGroups || [],
      );
      for (const runGroup of newAiFixes) {
        this.showAiFixNotification(newCIPE, runGroup);
      }
    } else {
      // No old CIPE - show AI fix notification for any existing AI fixes
      for (const runGroup of newCIPE.runGroups || []) {
        if (
          runGroup.aiFix?.suggestedFix &&
          runGroup.aiFix.suggestedFixStatus !== 'NOT_STARTED'
        ) {
          this.showAiFixNotification(newCIPE, runGroup);
        }
      }
    }

    const couldShow = couldShowCIPENotification(oldCIPE, newCIPE);
    if (!couldShow) {
      return;
    }

    // CIPE success notifications
    if (newCIPE.status === 'SUCCEEDED') {
      if (this.nxCloudNotificationsSetting === 'all') {
        this.showCIPESuccessNotification(newCIPE);
      }
      return;
    }

    const shouldWaitForAiFix =
      newCIPE.aiFixesEnabled && !hasPassedAiFixWaitTime(newCIPE);

    if (shouldWaitForAiFix) {
      return;
    }

    // CIPE error notifications
    if (isFailedStatus(newCIPE.status)) {
      this.showCIPEFailureNotification(newCIPE);
      return;
    }

    // run failed notifications
    const failedRun = findFailedRun(newCIPE);
    if (newCIPE.status === 'IN_PROGRESS' && failedRun) {
      this.showCommandFailureNotification(newCIPE, failedRun);
      return;
    }
  }
}

function couldShowCIPENotification(
  oldCIPE: CIPEInfo | undefined,
  newCIPE: CIPEInfo,
): boolean {
  // If there's no old CIPE, this is a new CIPE appearing in our list
  if (!oldCIPE) {
    // For new CIPEs, we could show notifications if:
    // 1. It's completed/failed (not IN_PROGRESS)
    // 2. OR it's IN_PROGRESS but has failed runs
    return newCIPE.status !== 'IN_PROGRESS' || !!findFailedRun(newCIPE);
  }

  // we don't want to send notifications for status changes that
  // would've triggered a notification in the past
  const oldCipeHadNotifiableState =
    oldCIPE.status !== 'IN_PROGRESS' || !!findFailedRun(oldCIPE);

  if (oldCipeHadNotifiableState) {
    // the one exception to this is if the CIPE was previously suppressed
    const wasSuppressed = shouldSuppressCIPEFailureNotification(oldCIPE);
    const isNoLongerSuppressed =
      !shouldSuppressCIPEFailureNotification(newCIPE);
    const hasPassedWaitTime = hasPassedAiFixWaitTime(newCIPE);

    return wasSuppressed && isNoLongerSuppressed && hasPassedWaitTime;
  } else {
    return true;
  }
}

// When a CIPE fails, we will wait up to five minutes for an AI fix to become available
// during that time, we don't show failure notifications
const AI_FIX_WAIT_TIME_MS = 1000 * 60 * 5;

function hasPassedAiFixWaitTime(cipe: CIPEInfo): boolean {
  if (!cipe.completedAt) {
    return false;
  }

  return (
    cipe.status === 'FAILED' &&
    !hasAnyAiFix(cipe.runGroups || []) &&
    cipe.completedAt + AI_FIX_WAIT_TIME_MS < Date.now()
  );
}

function shouldSuppressCIPEFailureNotification(
  cipe: CIPEInfo | undefined,
): boolean {
  if (!cipe) {
    return false;
  }
  return (
    hasAnyAiFix(cipe.runGroups || []) ||
    (cipe.aiFixesEnabled && !hasPassedAiFixWaitTime(cipe))
  );
}

// helper functions
function hasAnyAiFix(runGroups: CIPERunGroup[]): boolean {
  return runGroups.some((runGroup) => !!runGroup.aiFix);
}

function findNewAiFixes(
  newRunGroups: CIPERunGroup[],
  oldRunGroups: CIPERunGroup[],
): CIPERunGroup[] {
  const newFixRunGroups: CIPERunGroup[] = [];

  for (const newRunGroup of newRunGroups) {
    if (
      newRunGroup.aiFix?.suggestedFix &&
      newRunGroup.aiFix.suggestedFixStatus !== 'NOT_STARTED'
    ) {
      const oldRunGroup = oldRunGroups.find(
        (rg) => rg.runGroup === newRunGroup.runGroup,
      );
      if (!oldRunGroup?.aiFix?.suggestedFix) {
        newFixRunGroups.push(newRunGroup);
      }
    }
  }

  return newFixRunGroups;
}

function findFailedRun(cipe: CIPEInfo): CIPERun | undefined {
  return cipe.runGroups
    .flatMap((runGroup) => runGroup.runs)
    .find(
      (run) =>
        (run.status && isFailedStatus(run.status)) ||
        (run.numFailedTasks && run.numFailedTasks > 0),
    );
}

function truncateCommand(command: string): string {
  return command.length > 70 ? command.substring(0, 60) + '[...]' : command;
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

function getAIFixMessage(branch: string) {
  return `CI failed. Nx Cloud AI has a fix for #${branch}`;
}

// status bar updates
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
