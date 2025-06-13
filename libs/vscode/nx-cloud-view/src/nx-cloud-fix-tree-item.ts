import { CIPEInfo, CIPERunGroup } from '@nx-console/shared-types';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import {
  downloadAndExtractArtifact,
  nxCloudAuthHeaders,
} from '@nx-console/shared-nx-cloud';
import { xhr } from 'request-light';
import {
  commands,
  ExtensionContext,
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeItemCollapsibleState,
  window,
  workspace,
} from 'vscode';
import {
  BaseRecentCIPETreeItem,
  NxCloudFixTreeItem as NxCloudFixTreeItemInterface,
} from './base-tree-item';
import { outputLogger } from '@nx-console/vscode-output-channels';
import { NxCloudFixWebview } from './nx-cloud-fix-webview';
import { DiffContentProvider, FileDiff } from './diffs/diff-provider';

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
  ) {
    // Initialize with a default label
    super('Nx Cloud Fix');

    this.collapsibleState = TreeItemCollapsibleState.None;
    this.id = `${cipeId}-${runGroup.runGroup}-aifix`;
    this.contextValue = 'nxCloudFix';

    // Make the tree item clickable - it will open the webview
    this.command = {
      command: 'nxCloud.openFixDetails',
      title: 'Open Fix Details',
      arguments: [{ cipeId: this.cipeId, runGroup: this.runGroup }],
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
      } else if (userAction === 'REJECTED') {
        this.contextValue += '-rejected';
        this.label = 'This fix has been ignored';
        this.iconPath = new ThemeIcon(
          'close',
          new ThemeColor('notebookStatusErrorIcon.foreground'),
        );
      } else {
        // If userAction is NONE, proceed with normal validation status logic
        const hasFix = !!aiFix.suggestedFix;
        const validationStatus = aiFix.validationStatus;

        if (hasFix) {
          // Fix has been created - show different states based on validation
          this.contextValue += '-hasFix';
          switch (validationStatus) {
            case 'NOT_STARTED':
              this.contextValue += '-notValidated';
              this.label = 'The fix is ready';
              this.iconPath = new ThemeIcon(
                'wrench',
                new ThemeColor('editorInfo.foreground'),
              );
              break;
            case 'IN_PROGRESS':
              this.contextValue += '-validating';
              this.label = 'Nx Cloud is validating the fix';
              this.iconPath = new ThemeIcon(
                'loading~spin',
                new ThemeColor('notebookStatusRunningIcon.foreground'),
              );
              break;
            case 'COMPLETED':
              this.contextValue += '-validated';
              this.label = 'Nx Cloud has validated the fix';
              this.iconPath = new ThemeIcon(
                'wrench',
                new ThemeColor('charts.green'),
              );
              break;
            case 'FAILED':
              this.contextValue += '-validationFailed';
              this.label = 'The fix validation failed';
              this.iconPath = new ThemeIcon(
                'warning',
                new ThemeColor('list.warningForeground'),
              );
              break;
          }
        } else {
          // No fix yet - we're still creating it
          switch (validationStatus) {
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
              this.label = 'The fix failed';
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

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    return [];
  }
}

async function updateSuggestedFix(
  aiFixId: string,
  action: 'APPLIED' | 'REJECTED',
): Promise<boolean> {
  try {
    const nxCloudInfo = await getNxCloudStatus();
    if (!nxCloudInfo?.nxCloudUrl) {
      window.showErrorMessage('Nx Cloud URL not found');
      return false;
    }

    const workspacePath = getWorkspacePath();
    const response = await xhr({
      url: `${nxCloudInfo.nxCloudUrl}/nx-cloud/update-suggested-fix`,
      type: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await nxCloudAuthHeaders(workspacePath)),
      },
      data: JSON.stringify({
        aiFixId,
        action,
      }),
    });

    if (response.status >= 200 && response.status < 300) {
      return true;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.responseText}`);
    }
  } catch (error) {
    console.error('Failed to update suggested fix:', error);
    window.showErrorMessage(
      `Failed to ${action.toLowerCase()} AI fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return false;
  }
}

export function registerNxCloudFixCommands(
  extensionContext: ExtensionContext,
  recentCIPEProvider: {
    recentCIPEInfo?: CIPEInfo[];
  },
) {
  // Register content providers for virtual diff documents
  const diffContentProvider = new DiffContentProvider();
  extensionContext.subscriptions.push(
    workspace.registerTextDocumentContentProvider(
      'nx-cloud-fix-before',
      diffContentProvider,
    ),
    workspace.registerTextDocumentContentProvider(
      'nx-cloud-fix-after',
      diffContentProvider,
    ),
  );

  // Create the webview instance for CI Fix details
  const nxCloudFixWebview = new NxCloudFixWebview(extensionContext);

  return [
    commands.registerCommand(
      'nxCloud.applyAiFix',
      async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
        if (!data.runGroup.aiFix?.suggestedFix) {
          window.showErrorMessage('No AI fix available to apply');
          return;
        }

        const aiFixId = data.runGroup.aiFix.aiFixId;
        if (!aiFixId) {
          window.showErrorMessage('AI fix ID not found');
          return;
        }

        const success = await updateSuggestedFix(aiFixId, 'APPLIED');
        if (success) {
          window.showInformationMessage('Nx Cloud fix applied successfully');
          commands.executeCommand('nxCloud.refresh');
        }
      },
    ),
    commands.registerCommand(
      'nxCloud.rejectAiFix',
      async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
        if (!data.runGroup.aiFix) {
          window.showErrorMessage('No AI fix available to ignore');
          return;
        }

        const aiFixId = data.runGroup.aiFix.aiFixId;
        if (!aiFixId) {
          window.showErrorMessage('AI fix ID not found');
          return;
        }

        const success = await updateSuggestedFix(aiFixId, 'REJECTED');
        if (success) {
          window.showInformationMessage('Nx Cloud fix ignored');
          commands.executeCommand('nxCloud.refresh');
        }
      },
    ),
    commands.registerCommand(
      'nxCloud.openFixDetails',
      async (args: { cipeId: string; runGroup: CIPERunGroup }) => {
        if (!args.runGroup.aiFix) {
          console.log('No AI fix available on tree item');
          return;
        }

        // Find the parent CIPE
        const cipe = recentCIPEProvider.recentCIPEInfo?.find(
          (c) => c.ciPipelineExecutionId === args.cipeId,
        );
        if (!cipe) {
          console.log('No CIPE found for ID:', args.cipeId);
          return;
        }

        console.log('Found CIPE, calling webview.showFixDetails');
        getTelemetry().logUsage('cloud.open-fix-details', {
          source: 'cloud-view',
        });

        let terminalOutput: string | undefined;
        const failedTaskId = args.runGroup.aiFix.taskIds[0];
        try {
          const terminalOutputUrl =
            args.runGroup.aiFix.terminalLogsUrls[failedTaskId];
          terminalOutput = await downloadAndExtractArtifact(
            terminalOutputUrl,
            outputLogger,
          );
        } catch (error) {
          outputLogger.log(
            `Failed to retrieve terminal output for task ${failedTaskId}: ${error}`,
          );
          terminalOutput =
            'Failed to retrieve terminal output. Please check the Nx Console output for more details.';
        }

        await nxCloudFixWebview.showFixDetails({
          cipe,
          runGroup: args.runGroup,
          terminalOutput,
        });
      },
    ),
  ];
}
