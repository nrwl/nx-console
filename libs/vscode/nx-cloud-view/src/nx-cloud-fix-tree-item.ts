import { CIPERunGroup } from '@nx-console/shared-types';
import {
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeItemCollapsibleState,
} from 'vscode';
import {
  BaseRecentCIPETreeItem,
  NxCloudFixTreeItem as NxCloudFixTreeItemInterface,
} from './base-tree-item';
import { FileDiff } from './diffs/diff-provider';

export function createUnifiedDiffView(fileDiffs: FileDiff[]): {
  beforeContent: string;
  afterContent: string;
} {
  const beforeSections: string[] = [];
  const afterSections: string[] = [];

  for (const fileDiff of fileDiffs) {
    // Add file header separator
    const fileHeader = `${'='.repeat(80)}\n${fileDiff.fileName}\n${'='.repeat(80)}`;

    beforeSections.push(fileHeader);
    afterSections.push(fileHeader);

    // Add the file content
    beforeSections.push(fileDiff.beforeContent);
    afterSections.push(fileDiff.afterContent);

    // Add spacing between files
    beforeSections.push('\n\n');
    afterSections.push('\n\n');
  }

  return {
    beforeContent: beforeSections.join('\n'),
    afterContent: afterSections.join('\n'),
  };
}

export class NxCloudFixTreeItem
  extends BaseRecentCIPETreeItem
  implements NxCloudFixTreeItemInterface
{
  type = 'nxCloudFix' as const;

  constructor(
    public runGroup: CIPERunGroup,
    public cipeId: string,
    public showRunGroupId = false,
  ) {
    super('Nx Cloud verified a fix');
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.iconPath = new ThemeIcon('wrench');
    this.contextValue = 'nxCloudFix';
    this.id = `${cipeId}-${runGroup.runGroup}-aifix`;

    // Make the tree item clickable - it will open the webview
    this.command = {
      command: 'nxCloud.openFixDetails',
      title: 'Open Fix Details',
      arguments: [{ cipeId: this.cipeId, runGroupId: this.runGroup.runGroup }],
    };

    const aiFix = this.runGroup.aiFix;
    if (aiFix) {
      this.contextValue += '-aifix';

      // Check user action first
      const userAction = aiFix.userAction;
      if (userAction === 'APPLIED') {
        this.contextValue += '-applied';
        this.label = 'Nx Cloud has applied the fix';
        this.iconPath = new ThemeIcon(
          'check',
          new ThemeColor('notebookStatusSuccessIcon.foreground'),
        );
      } else if (userAction === 'APPLIED_LOCALLY') {
        this.contextValue += '-appliedLocally';
        this.label =
          'The suggested changes have been applied to your local branch';
        this.iconPath = new ThemeIcon(
          'git-branch',
          new ThemeColor('notebookStatusSuccessIcon.foreground'),
        );
      } else if (userAction === 'REJECTED') {
        this.contextValue += '-rejected';
        this.label = 'Fix rejected by user';
        this.iconPath = new ThemeIcon(
          'circle-slash',
          new ThemeColor('notebookStatusErrorIcon.foreground'),
        );
      } else {
        // If userAction is NONE, proceed with normal validation status logic
        const hasFix = !!aiFix.suggestedFix;
        // TODO: Remove this once all environments have been migrated after deployment
        // Fall back to original validationStatus field for backwards compatibility
        const verificationStatus =
          aiFix.verificationStatus || (aiFix as any).validationStatus;

        if (hasFix) {
          // Fix has been created - show different states based on verification status
          this.contextValue += '-hasFix';
          switch (verificationStatus) {
            case 'NOT_STARTED':
              this.contextValue += '-notVerified';
              this.label = 'Nx Cloud fix ready to verify';
              this.iconPath = new ThemeIcon(
                'wrench',
                new ThemeColor('editorInfo.foreground'),
              );
              break;
            case 'IN_PROGRESS':
              this.contextValue += '-verifying';
              this.label = 'Nx Cloud is verifying the AI fix';
              this.iconPath = new ThemeIcon(
                'loading~spin',
                new ThemeColor('notebookStatusRunningIcon.foreground'),
              );
              break;
            case 'COMPLETED':
              this.contextValue += '-verified';
              this.label = 'Nx Cloud verified a fix';
              this.iconPath = new ThemeIcon(
                'verified',
                new ThemeColor('charts.green'),
              );
              break;
            case 'FAILED':
              this.contextValue += '-verificationFailed';
              this.label = 'Failed Nx Cloud fix verification';
              this.iconPath = new ThemeIcon(
                'warning',
                new ThemeColor('list.warningForeground'),
              );
              break;
          }
        } else {
          if (aiFix.failureClassification !== 'code_change') {
            this.contextValue += `-${aiFix.failureClassification}`;
            this.label = 'Nx Cloud identified a root cause for your failed CI';
            this.iconPath = new ThemeIcon(
              'warning',
              new ThemeColor('list.warningForeground'),
            );
          } else if (aiFix.suggestedFixStatus) {
            switch (aiFix.suggestedFixStatus) {
              case 'NOT_STARTED':
                this.contextValue += '-noFixYet';
                this.label = 'Nx Cloud is preparing to generate a fix';
                this.iconPath = new ThemeIcon(
                  'info',
                  new ThemeColor('notebookStatusRunningIcon.foreground'),
                );
                break;
              case 'IN_PROGRESS':
                this.contextValue += '-creatingFix';
                this.label = 'Nx Cloud is creating a fix';
                this.iconPath = new ThemeIcon(
                  'loading~spin',
                  new ThemeColor('notebookStatusRunningIcon.foreground'),
                );
                break;
              case 'NOT_EXECUTABLE':
                this.contextValue += '-cancelledFix';
                this.label = 'Nx Cloud is not able to generate a fix';
                this.iconPath = new ThemeIcon(
                  'circle-slash',
                  new ThemeColor('notebookStatusRunningIcon.foreground'),
                );
                break;
              case 'COMPLETED':
                this.contextValue += '-completedFix';
                this.label = 'Nx Cloud has generated a fix';
                this.iconPath = new ThemeIcon(
                  'check',
                  new ThemeColor('charts.green'),
                );
                break;
              case 'FAILED':
                this.contextValue += '-fixFailed';
                this.label = 'Nx Cloud failed to create a fix';
                this.iconPath = new ThemeIcon(
                  'error',
                  new ThemeColor('notebookStatusErrorIcon.foreground'),
                );
                break;
            }
          } else {
            // TODO: this branch can be eventually removed once all nx Cloud environments are updated
            switch (verificationStatus) {
              case 'NOT_STARTED':
              case 'IN_PROGRESS':
                this.contextValue += '-creatingFix';
                this.label = 'Nx Cloud is creating a fix';
                this.iconPath = new ThemeIcon(
                  'loading~spin',
                  new ThemeColor('notebookStatusRunningIcon.foreground'),
                );
                break;
              case 'COMPLETED':
              case 'FAILED':
                this.contextValue += '-fixFailed';
                this.label = 'Nx Cloud failed to create a fix';
                this.iconPath = new ThemeIcon(
                  'error',
                  new ThemeColor('notebookStatusErrorIcon.foreground'),
                );
                break;
            }
          }
        }
      }
    }

    if (this.showRunGroupId) {
      this.label += ` (${this.runGroup.ciExecutionEnv ?? this.runGroup.runGroup})`;
    }
  }

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    return [];
  }
}
