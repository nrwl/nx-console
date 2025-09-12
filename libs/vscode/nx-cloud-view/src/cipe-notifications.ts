// import { CIPEInfo, CIPERun, CIPERunGroup } from '@nx-console/shared-types';
// import { isFailedStatus } from '@nx-console/shared-utils';
// import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';
// import { getTelemetry } from '@nx-console/vscode-telemetry';
// import { commands, window, StatusBarItem, StatusBarAlignment } from 'vscode';

// let aiFixStatusBarItem: StatusBarItem | undefined;

// export class CIPENotificationService {
//   private sentNotifications = new Map<
//     string,
//     {
//       success: boolean;
//       failedRun: boolean;
//       failure: boolean;
//       aiFix: boolean;
//     }
//   >();

//   compareCIPEDataAndSendNotifications(
//     oldInfo: CIPEInfo[] | null,
//     newInfo: CIPEInfo[],
//   ) {
//     compareCIPEDataAndSendNotification(oldInfo, newInfo);
//   }
// }

// export function compareCIPEDataAndSendNotification(
//   oldInfo: CIPEInfo[] | null,
//   newInfo: CIPEInfo[],
// ) {
//   // Always update status bar first
//   updateAiFixStatusBar(newInfo);

//   const nxCloudNotificationsSetting = GlobalConfigurationStore.instance.get(
//     'nxCloudNotifications',
//   );

//   // Early return if notifications are disabled
//   if (nxCloudNotificationsSetting === 'none') {
//     return;
//   }

//   // Skip notifications on initial load since we don't know if CIPEs
//   // just completed or are just being loaded for the first time
//   if (oldInfo === null) {
//     return;
//   }

//   // Process each CIPE for potential notifications
//   for (const newCIPE of newInfo) {
//     // Find the corresponding old CIPE if it exists
//     // const oldCIPE = oldInfo.find(
//     //   (old) => old.ciPipelineExecutionId === newCIPE.ciPipelineExecutionId,
//     // );
//     // processCIPENotifications(oldCIPE, newCIPE, nxCloudNotificationsSetting);

//     for (const newRunGroup of newCIPE.runGroups || []) {
//     if (
//       newRunGroup.aiFix?.suggestedFix &&
//       newRunGroup.aiFix.suggestedFixStatus !== 'NOT_STARTED'
//     )  {}
//   }
// }

// function processCIPENotifications(
//   oldCIPE: CIPEInfo | undefined,
//   newCIPE: CIPEInfo,
//   notificationSetting: string,
// ) {
//   // Check for AI fixes to notify about
//   if (oldCIPE) {
//     // Compare with old CIPE to find new AI fixes
//     const newAiFixes = findNewAiFixes(
//       newCIPE.runGroups || [],
//       oldCIPE.runGroups || [],
//     );
//     for (const runGroup of newAiFixes) {
//       showAiFixNotification(newCIPE, runGroup);
//     }
//   } else {
//     // No old CIPE - show AI fix notification for any existing AI fixes
//     for (const runGroup of newCIPE.runGroups || []) {
//       if (
//         runGroup.aiFix?.suggestedFix &&
//         runGroup.aiFix.suggestedFixStatus !== 'NOT_STARTED'
//       ) {
//         showAiFixNotification(newCIPE, runGroup);
//       }
//     }
//   }

//   // Determine if we should show any completion/failure notifications
//   const shouldShow = shouldShowCIPENotification(oldCIPE, newCIPE);
//   if (!shouldShow) {
//     return;
//   }

//   // Check if we should suppress failure notifications due to AI fix
//   const shouldSuppressFailure = shouldSuppressCIPEFailureNotification(newCIPE);

//   // Show appropriate notification based on CIPE status
//   if (newCIPE.status === 'SUCCEEDED') {
//     if (notificationSetting === 'all') {
//       showSuccessNotification(newCIPE);
//     }
//   } else if (isFailedStatus(newCIPE.status) && !shouldSuppressFailure) {
//     showFailureNotification(newCIPE);
//   } else if (newCIPE.status === 'IN_PROGRESS') {
//     // Check for failed runs within the IN_PROGRESS CIPE
//     const failedRun = findFailedRun(newCIPE);
//     if (failedRun && !shouldSuppressFailure) {
//       showFailureNotification(newCIPE, failedRun);
//     }
//   }
// }

// // Pure helper functions for AI fix detection
// const AI_FIX_WAIT_TIME_MS = 1000 * 60 * 5;

// function hasAnyAiFix(runGroups: CIPERunGroup[]): boolean {
//   return runGroups.some((runGroup) => !!runGroup.aiFix);
// }

// function hasPassedAiFixWaitTime(cipe: CIPEInfo): boolean {
//   if (!cipe.completedAt) {
//     return false;
//   }

//   return (
//     cipe.status === 'FAILED' &&
//     !hasAnyAiFix(cipe.runGroups || []) &&
//     cipe.completedAt + AI_FIX_WAIT_TIME_MS < Date.now()
//   );
// }

// function shouldSuppressCIPEFailureNotification(cipe: CIPEInfo): boolean {
//   return (
//     hasAnyAiFix(cipe.runGroups || []) ||
//     (cipe.aiFixesEnabled && !hasPassedAiFixWaitTime(cipe))
//   );
// }

// function findNewAiFixes(
//   newRunGroups: CIPERunGroup[],
//   oldRunGroups: CIPERunGroup[],
// ): CIPERunGroup[] {
//   const newFixRunGroups: CIPERunGroup[] = [];

//   for (const newRunGroup of newRunGroups) {
//     if (
//       newRunGroup.aiFix?.suggestedFix &&
//       newRunGroup.aiFix.suggestedFixStatus !== 'NOT_STARTED'
//     ) {
//       const oldRunGroup = oldRunGroups.find(
//         (rg) => rg.runGroup === newRunGroup.runGroup,
//       );
//       if (!oldRunGroup?.aiFix?.suggestedFix) {
//         newFixRunGroups.push(newRunGroup);
//       }
//     }
//   }

//   return newFixRunGroups;
// }

// // Pure helper functions for CIPE comparison
// function findFailedRun(cipe: CIPEInfo): CIPERun | undefined {
//   return cipe.runGroups
//     .flatMap((runGroup) => runGroup.runs)
//     .find(
//       (run) =>
//         (run.status && isFailedStatus(run.status)) ||
//         (run.numFailedTasks && run.numFailedTasks > 0),
//     );
// }

// function isDelayedNotification(
//   oldCIPE: CIPEInfo | undefined,
//   newCIPE: CIPEInfo,
// ): boolean {
//   if (!oldCIPE) return false;

//   // This is the case where we previously suppressed a notification
//   // because we were waiting for an AI fix, but now the wait time has passed
//   // and no fix has arrived
//   const wasSuppressed = shouldSuppressCIPEFailureNotification(oldCIPE);
//   const isNoLongerSuppressed = !shouldSuppressCIPEFailureNotification(newCIPE);
//   const hasPassedWaitTime = hasPassedAiFixWaitTime(newCIPE);

//   return wasSuppressed && isNoLongerSuppressed && hasPassedWaitTime;
// }

// // Helper functions for notification display
// function truncateCommand(command: string): string {
//   return command.length > 70 ? command.substring(0, 60) + '[...]' : command;
// }

// function showFailureNotification(cipe: CIPEInfo, failedRun?: CIPERun) {
//   if (failedRun) {
//     const command = truncateCommand(failedRun.command);
//     showMessageWithResultAndCommit(
//       `"${command}" failed on #${cipe.branch}.`,
//       failedRun.runUrl,
//       cipe.commitUrl,
//       'error',
//     );
//   } else {
//     showMessageWithResultAndCommit(
//       `CI failed for #${cipe.branch}.`,
//       cipe.cipeUrl,
//       cipe.commitUrl,
//       'error',
//     );
//   }
// }

// function showSuccessNotification(cipe: CIPEInfo) {
//   showMessageWithResultAndCommit(
//     `CI succeeded for #${cipe.branch}.`,
//     cipe.cipeUrl,
//     cipe.commitUrl,
//     'information',
//   );
// }

// function shouldShowCIPENotification(
//   oldCIPE: CIPEInfo | undefined,
//   newCIPE: CIPEInfo,
// ): boolean {
//   // If there's no old CIPE, this is a new CIPE appearing in our list
//   if (!oldCIPE) {
//     // For new CIPEs, show notification if:
//     // 1. It's completed/failed (not IN_PROGRESS)
//     // 2. OR it's IN_PROGRESS but has failed runs
//     return newCIPE.status !== 'IN_PROGRESS' || !!findFailedRun(newCIPE);
//   }

//   // Check if this is a delayed notification scenario
//   // (we previously suppressed due to waiting for AI fix, but time has passed)
//   const isDelayed = isDelayedNotification(oldCIPE, newCIPE);

//   // If the CIPE was already completed or had failed runs,
//   // we've likely already shown a notification
//   const wasAlreadyNotified =
//     oldCIPE.status !== 'IN_PROGRESS' || !!findFailedRun(oldCIPE);

//   // Show notification if:
//   // 1. It's a delayed notification (we suppressed before, now showing)
//   // 2. It's a new completion/failure (wasn't already notified)
//   return isDelayed || !wasAlreadyNotified;
// }

// function showMessageWithResultAndCommit(
//   message: string,
//   resultUrl: string,
//   commitUrl: string | undefined | null,
//   type: 'information' | 'error' = 'information',
// ) {
//   const telemetry = getTelemetry();
//   telemetry.logUsage('cloud.show-cipe-notification');
//   const show =
//     type === 'information'
//       ? window.showInformationMessage
//       : window.showErrorMessage;

//   type MessageCommand =
//     | 'View Results'
//     | 'Help me fix this error'
//     | 'View Commit';
//   const messageCommands: MessageCommand[] = [];

//   if (type === 'error') {
//     messageCommands.push('Help me fix this error');
//   }
//   if (commitUrl) {
//     messageCommands.push('View Commit');
//   }

//   messageCommands.push('View Results');

//   const handleResults = async (selection: MessageCommand | undefined) => {
//     if (selection === 'View Results') {
//       telemetry.logUsage('cloud.view-cipe', {
//         source: 'notification',
//       });
//       commands.executeCommand('vscode.open', resultUrl);
//     } else if (selection === 'View Commit') {
//       telemetry.logUsage('cloud.view-cipe-commit', {
//         source: 'notification',
//       });
//       commands.executeCommand('vscode.open', commitUrl);
//     } else if (selection === 'Help me fix this error') {
//       telemetry.logUsage('cloud.fix-cipe-error', {
//         source: 'notification',
//       });
//       commands.executeCommand('nxCloud.helpMeFixCipeError');
//     }
//   };

//   show(message, ...messageCommands).then(handleResults);
// }

// function showAiFixNotification(cipe: CIPEInfo, runGroup: CIPERunGroup) {
//   const telemetry = getTelemetry();
//   telemetry.logUsage('cloud.show-ai-fix-notification');

//   type MessageCommand = 'Show Fix' | 'Reject';
//   const messageCommands: MessageCommand[] = ['Show Fix', 'Reject'];

//   const handleResults = async (selection: MessageCommand | undefined) => {
//     if (selection === 'Show Fix') {
//       telemetry.logUsage('cloud.show-ai-fix', {
//         source: 'notification',
//       });
//       commands.executeCommand('nxCloud.openFixDetails', {
//         cipeId: cipe.ciPipelineExecutionId,
//         runGroupId: runGroup.runGroup,
//       });
//     } else if (selection === 'Reject') {
//       telemetry.logUsage('cloud.reject-ai-fix', {
//         source: 'notification',
//       });
//       commands.executeCommand('nxCloud.rejectAiFix', { cipe, runGroup });
//     }
//   };

//   const message = getAIFixMessage(cipe.branch);

//   window.showErrorMessage(message, ...messageCommands).then(handleResults);
// }

// export function disposeAiFixStatusBarItem() {
//   if (aiFixStatusBarItem) {
//     aiFixStatusBarItem.dispose();
//     aiFixStatusBarItem = undefined;
//   }
// }

// export function hideAiFixStatusBarItem() {
//   if (aiFixStatusBarItem) {
//     aiFixStatusBarItem.hide();
//   }
// }

// export function updateAiFixStatusBar(cipeData: CIPEInfo[]) {
//   let foundFix: { cipe: CIPEInfo; runGroup: CIPERunGroup } | null = null;

//   for (const cipe of cipeData) {
//     for (const runGroup of cipe.runGroups || []) {
//       if (
//         runGroup.aiFix?.suggestedFix &&
//         runGroup.aiFix.userAction === 'NONE'
//       ) {
//         foundFix = { cipe, runGroup };
//         break;
//       }
//     }
//     if (foundFix) break;
//   }

//   if (foundFix) {
//     if (!aiFixStatusBarItem) {
//       aiFixStatusBarItem = window.createStatusBarItem(
//         StatusBarAlignment.Left,
//         100,
//       );
//     }

//     const message = getAIFixMessage(foundFix.cipe.branch);

//     aiFixStatusBarItem.text = `$(wrench) Nx Cloud AI Fix`;
//     aiFixStatusBarItem.tooltip = message;
//     aiFixStatusBarItem.command = {
//       command: 'nxCloud.openFixDetails',
//       title: 'Show Error Details',
//       arguments: [
//         {
//           cipeId: foundFix.cipe.ciPipelineExecutionId,
//           runGroupId: foundFix.runGroup.runGroup,
//         },
//       ],
//     };
//     aiFixStatusBarItem.show();
//   } else {
//     // Hide status bar if no fixes available
//     hideAiFixStatusBarItem();
//   }
// }

// function getAIFixMessage(branch: string) {
//   return `CI failed. Nx Cloud AI has a fix for #${branch}`;
// }
