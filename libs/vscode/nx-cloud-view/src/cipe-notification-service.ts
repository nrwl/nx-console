import { CIPEInfo, CIPERun, CIPERunGroup } from '@nx-console/shared-types';
import { isFailedStatus } from '@nx-console/shared-utils';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode-configuration';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { commands, window } from 'vscode';
import { fetchAndPullChanges } from './nx-cloud-fix-webview';
import { execSync } from 'child_process';

export class CIPENotificationService {
  private sentNotifications = new Set<string>();
  private sentAppliedNotifications = new Set<string>();

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
      const oldCIPE = oldInfo.find(
        (old) => old.ciPipelineExecutionId === cipeId,
      );

      // Always process AI fix notifications (they have separate tracking)
      this.processAIFixNotifications(oldCIPE, newCIPE);

      // Only process regular CIPE notifications if we haven't sent one already
      if (!this.sentNotifications.has(cipeId)) {
        this.processCIPENotifications(oldCIPE, newCIPE);
      }
    }
  }

  private processCIPENotifications(
    oldCIPE: CIPEInfo | undefined,
    newCIPE: CIPEInfo,
  ) {
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

  private processAIFixNotifications(
    oldCIPE: CIPEInfo | undefined,
    newCIPE: CIPEInfo,
  ) {
    let runGroupsToProcess: CIPERunGroup[] | undefined = undefined;
    // only process AI fixes for rungroups with new ai fixes
    if (oldCIPE) {
      runGroupsToProcess = findRunGroupsWithNewAiFixes(
        newCIPE.runGroups || [],
        oldCIPE.runGroups || [],
      );
    } else {
      // No old CIPE - process AI fix notification for any existing AI fixes
      runGroupsToProcess = newCIPE.runGroups;
    }

    if (!runGroupsToProcess) {
      return;
    }
    runGroupsToProcess = runGroupsToProcess.filter(
      (rg) =>
        rg.aiFix?.suggestedFix && rg.aiFix.suggestedFixStatus !== 'NOT_STARTED',
    );
    for (const runGroup of runGroupsToProcess) {
      // if auto apply is enabled, we don't show the notification until after verification is complete
      if (
        runGroup.aiFix &&
        runGroup.aiFix.couldAutoApplyTasks &&
        runGroup.aiFix.verificationStatus !== 'COMPLETED'
      ) {
        continue;
      }
      this.showAiFixNotification(newCIPE, runGroup);
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
    const telemetry = getTelemetry();

    // Check if the fix was applied (manually or automatically)
    if (
      runGroup.aiFix?.userAction === 'APPLIED' ||
      runGroup.aiFix?.userAction === 'APPLIED_AUTOMATICALLY'
    ) {
      if (this.sentAppliedNotifications.has(cipe.ciPipelineExecutionId)) {
        return;
      }
      this.sentAppliedNotifications.add(cipe.ciPipelineExecutionId);

      telemetry.logUsage('cloud.show-ai-fix-notification', {
        source: 'notification',
      });

      const message =
        runGroup.aiFix.userAction === 'APPLIED_AUTOMATICALLY'
          ? `Nx Cloud automatically applied a fix for #${cipe.branch}`
          : `Nx Cloud applied a fix for #${cipe.branch}`;

      this.showAppliedFixNotification(cipe, message);
      return;
    }

    // Original notification for pending fixes
    if (this.sentNotifications.has(cipe.ciPipelineExecutionId)) {
      return;
    }
    this.sentNotifications.add(cipe.ciPipelineExecutionId);

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

  private showAppliedFixNotification(cipe: CIPEInfo, message: string) {
    const telemetry = getTelemetry();
    const notificationCommands: ('View PR' | 'Fetch & Pull Changes')[] = [];

    if (cipe.commitUrl) {
      notificationCommands.push('View PR');
    }

    const targetBranch = cipe.branch;
    let hasBranchOnRemote: boolean;
    try {
      execSync(`git rev-parse --verify origin/${targetBranch}`, {
        cwd: getNxWorkspacePath(),
      });
      hasBranchOnRemote = true;
    } catch {
      hasBranchOnRemote = false;
    }

    if (hasBranchOnRemote) {
      notificationCommands.push('Fetch & Pull Changes');
    }

    window
      .showInformationMessage(message, ...notificationCommands)
      .then((selection) => {
        if (selection === 'View PR') {
          telemetry.logUsage('cloud.show-ai-fix', {
            source: 'notification',
          });
          commands.executeCommand('vscode.open', cipe.commitUrl);
        } else if (selection === 'Fetch & Pull Changes') {
          fetchAndPullChanges(targetBranch);
        }
      });
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

function findRunGroupsWithNewAiFixes(
  newRunGroups: CIPERunGroup[],
  oldRunGroups: CIPERunGroup[],
): CIPERunGroup[] {
  const newFixRunGroups: CIPERunGroup[] = [];

  for (const newRunGroup of newRunGroups) {
    const oldRunGroup = oldRunGroups.find(
      (rg) => rg.runGroup === newRunGroup.runGroup,
    );

    // Trigger if there's no old AI fix, or if userAction has changed
    const hasNewFix =
      !oldRunGroup?.aiFix?.suggestedFix && newRunGroup.aiFix?.suggestedFix;
    const hasUserActionChange =
      oldRunGroup?.aiFix?.userAction !== newRunGroup.aiFix?.userAction;

    if (hasNewFix || hasUserActionChange) {
      newFixRunGroups.push(newRunGroup);
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

export function getAIFixMessage(branch: string) {
  return `CI failed. Nx Cloud AI has a fix for #${branch}`;
}
