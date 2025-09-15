import { CIPEInfo, CIPERunGroup } from '@nx-console/shared-types';
import { StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { Disposable } from 'vscode-languageserver';
import { getAIFixMessage } from './cipe-notification-service';

let __instance: AiFixStatusBarService | undefined = undefined;
export function getAiFixStatusBarService(): AiFixStatusBarService {
  if (!__instance) {
    __instance = new AiFixStatusBarService();
  }
  return __instance;
}

export class AiFixStatusBarService implements Disposable {
  private aiFixStatusBarItem: StatusBarItem | undefined;

  public dispose() {
    if (this.aiFixStatusBarItem) {
      this.aiFixStatusBarItem.dispose();
      this.aiFixStatusBarItem = undefined;
    }
  }

  public hideAiFixStatusBarItem() {
    if (this.aiFixStatusBarItem) {
      this.aiFixStatusBarItem.hide();
    }
  }

  public updateAiFixStatusBar(cipeData: CIPEInfo[]) {
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
      if (!this.aiFixStatusBarItem) {
        this.aiFixStatusBarItem = window.createStatusBarItem(
          StatusBarAlignment.Left,
          100,
        );
      }

      const message = getAIFixMessage(foundFix.cipe.branch);

      this.aiFixStatusBarItem.text = `$(wrench) Nx Cloud AI Fix`;
      this.aiFixStatusBarItem.tooltip = message;
      this.aiFixStatusBarItem.command = {
        command: 'nxCloud.openFixDetails',
        title: 'Show Error Details',
        arguments: [
          {
            cipeId: foundFix.cipe.ciPipelineExecutionId,
            runGroupId: foundFix.runGroup.runGroup,
          },
        ],
      };
      this.aiFixStatusBarItem.show();
    } else {
      // Hide status bar if no fixes available
      this.hideAiFixStatusBarItem();
    }
  }
}
