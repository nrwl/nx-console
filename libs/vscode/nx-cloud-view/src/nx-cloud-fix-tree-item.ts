import {
  AITaskFixValidationStatus,
  CIPEInfo,
  CIPERunGroup,
} from '@nx-console/shared-types';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import { nxCloudAuthHeaders } from '@nx-console/shared-nx-cloud';
import { xhr } from 'request-light';
import { join } from 'path';
import {
  CancellationToken,
  commands,
  ProviderResult,
  TextDocumentContentProvider,
  ThemeColor,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
} from 'vscode';
import {
  BaseRecentCIPETreeItem,
  NxCloudFixTreeItem as NxCloudFixTreeItemInterface,
} from './base-tree-item';

export class AiFixDiffContentProvider implements TextDocumentContentProvider {
  private static diffContent = new Map<string, string>();

  static setContent(uri: string, content: string): void {
    this.diffContent.set(uri, content);
  }

  static clearContent(uri: string): void {
    this.diffContent.delete(uri);
  }

  async provideTextDocumentContent(
    uri: Uri,
    _: CancellationToken,
  ): Promise<string | undefined> {
    const key = uri.toString();
    return AiFixDiffContentProvider.diffContent.get(key);
  }
}

interface FileDiff {
  fileName: string;
  beforeContent: string;
  afterContent: string;
}

function parseGitDiff(gitDiff: string): FileDiff[] {
  const lines = gitDiff.split('\n');
  const fileDiffs: FileDiff[] = [];
  let currentFile: Partial<FileDiff> | null = null;
  let beforeContent: string[] = [];
  let afterContent: string[] = [];
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of new file diff
    if (line.startsWith('diff --git')) {
      // Save the previous file if it exists
      if (currentFile && currentFile.fileName) {
        fileDiffs.push({
          fileName: currentFile.fileName,
          beforeContent: beforeContent.join('\n'),
          afterContent: afterContent.join('\n'),
        });
      }

      // Reset for new file
      currentFile = {};
      beforeContent = [];
      afterContent = [];
      inHunk = false;

      // Extract file name from the diff line if possible
      // Format: diff --git a/path/to/file b/path/to/file
      const matches = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (matches && currentFile) {
        currentFile.fileName = matches[1]; // Use the "a/" path
      }
    }
    // File name detection (more reliable)
    else if (line.startsWith('--- ')) {
      if (line.startsWith('--- a/') && currentFile) {
        currentFile.fileName = line.substring(6);
      } else if (line.startsWith('--- /dev/null')) {
        // New file, name will come from +++ line
      }
    } else if (line.startsWith('+++ ')) {
      if (line.startsWith('+++ b/') && currentFile) {
        // Use this as the file name if we don't have one yet
        if (!currentFile.fileName) {
          currentFile.fileName = line.substring(6);
        }
      } else if (line.startsWith('+++ /dev/null')) {
        // Deleted file, we should already have the name from --- line
      }
    }
    // Hunk header: @@ -start,count +start,count @@
    else if (line.startsWith('@@')) {
      inHunk = true;
    }
    // Content lines within a hunk
    else if (inHunk && currentFile) {
      if (line.startsWith('-')) {
        // Line removed from original
        beforeContent.push(line.substring(1));
      } else if (line.startsWith('+')) {
        // Line added to new version
        afterContent.push(line.substring(1));
      } else if (line.startsWith(' ')) {
        // Context line (present in both versions)
        const contextLine = line.substring(1);
        beforeContent.push(contextLine);
        afterContent.push(contextLine);
      } else if (line === '') {
        // Empty line
        beforeContent.push('');
        afterContent.push('');
      }
    }
  }

  // Add the last file if it exists
  if (currentFile && currentFile.fileName) {
    fileDiffs.push({
      fileName: currentFile.fileName,
      beforeContent: beforeContent.join('\n'),
      afterContent: afterContent.join('\n'),
    });
  }

  return fileDiffs;
}

function createUnifiedDiffView(fileDiffs: FileDiff[]): {
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

async function showAiFixDiff(gitDiff: string): Promise<void> {
  // Parse the git diff to extract file changes
  const parsedDiff = parseGitDiff(gitDiff);

  if (parsedDiff.length === 0) {
    // If we can't parse the diff, fall back to showing raw diff
    const doc = await workspace.openTextDocument({
      content: gitDiff,
      language: 'diff',
    });
    await window.showTextDocument(doc, { preview: false });
    return;
  }

  // Try to use VS Code's MultiDiffEditor via the vscode.changes command
  const timestamp = Date.now();
  const changeUris: [Uri, Uri, Uri][] = [];

  // Get the workspace path for constructing real file URIs
  const workspacePath = getWorkspacePath();

  if (!workspacePath) {
    return;
  }

  for (const fileDiff of parsedDiff) {
    // Create unique identifiers for the virtual content
    const fileId = `${fileDiff.fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

    // Create virtual URIs for before and after content with clean paths
    const beforeUri = Uri.parse(`nx-cloud-fix-before:${fileId}`).with({
      path: `${fileDiff.fileName}`,
      query: `before-${timestamp}`,
    });
    const afterUri = Uri.parse(`nx-cloud-fix-after:${fileId}`).with({
      path: `${fileDiff.fileName}`,
      query: `after-${timestamp}`,
    });

    // Store content in the provider
    AiFixDiffContentProvider.setContent(
      beforeUri.toString(),
      fileDiff.beforeContent,
    );
    AiFixDiffContentProvider.setContent(
      afterUri.toString(),
      fileDiff.afterContent,
    );

    // Create the resource URI that points to the REAL workspace file
    // This is the key fix - ensure we're using the correct absolute path
    const absoluteFilePath = join(workspacePath, fileDiff.fileName);
    const resourceUri = Uri.file(absoluteFilePath);

    // Add to the changes array: [resourceUri, originalUri, modifiedUri]
    // The resourceUri should be the actual file that will open when clicking "open file"
    changeUris.push([resourceUri, beforeUri, afterUri]);
  }

  // Try to open with the MultiDiffEditor command
  try {
    const title = `Nx Cloud Fix (${parsedDiff.length} file${parsedDiff.length === 1 ? '' : 's'})`;
    await commands.executeCommand('vscode.changes', title, changeUris);
  } catch (error) {
    // If the command doesn't exist or fails, fall back to unified diff
    console.log(
      'MultiDiffEditor not available, falling back to unified diff',
      error,
    );

    // Create a unified diff view showing all files
    const unifiedDiff = createUnifiedDiffView(parsedDiff);

    // Create virtual URIs for the unified before and after content
    const beforeUri = Uri.parse(
      `nx-cloud-fix-before:unified_${timestamp}/Nx Cloud Fix (Before)`,
    );
    const afterUri = Uri.parse(
      `nx-cloud-fix-after:unified_${timestamp}/Nx Cloud Fix (After)`,
    );

    // Store the unified content in the provider
    AiFixDiffContentProvider.setContent(
      beforeUri.toString(),
      unifiedDiff.beforeContent,
    );
    AiFixDiffContentProvider.setContent(
      afterUri.toString(),
      unifiedDiff.afterContent,
    );

    // Show the unified diff
    const title = `Nx Cloud Fix (${parsedDiff.length} file${parsedDiff.length === 1 ? '' : 's'})`;
    await commands.executeCommand('vscode.diff', beforeUri, afterUri, title, {
      preview: false,
      preserveFocus: false,
    });
  }
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

export function registerNxCloudFixCommands(recentCIPEProvider: {
  recentCIPEInfo?: CIPEInfo[];
}) {
  return [
    commands.registerCommand(
      'nxCloud.showAiFixFromTree',
      async (treeItem: BaseRecentCIPETreeItem) => {
        if (
          !(treeItem instanceof NxCloudFixTreeItem) ||
          !treeItem.runGroup.aiFix
        ) {
          return;
        }

        // Find the parent CIPE
        const cipe = recentCIPEProvider.recentCIPEInfo?.find(
          (c) => c.ciPipelineExecutionId === treeItem.cipeId,
        );
        if (!cipe) return;

        getTelemetry().logUsage('cloud.show-ai-fix', {
          source: 'cloud-view',
        });
        commands.executeCommand('nxCloud.showAiFix', {
          cipe,
          runGroup: treeItem.runGroup,
        });
      },
    ),
    commands.registerCommand(
      'nxCloud.applyAiFixFromTree',
      async (treeItem: BaseRecentCIPETreeItem) => {
        if (
          !(treeItem instanceof NxCloudFixTreeItem) ||
          !treeItem.runGroup.aiFix
        ) {
          return;
        }

        // Find the parent CIPE
        const cipe = recentCIPEProvider.recentCIPEInfo?.find(
          (c) => c.ciPipelineExecutionId === treeItem.cipeId,
        );
        if (!cipe) return;

        getTelemetry().logUsage('cloud.apply-ai-fix', {
          source: 'cloud-view',
        });
        commands.executeCommand('nxCloud.applyAiFix', {
          cipe,
          runGroup: treeItem.runGroup,
        });
      },
    ),
    commands.registerCommand(
      'nxCloud.ignoreAiFixFromTree',
      async (treeItem: BaseRecentCIPETreeItem) => {
        if (
          !(treeItem instanceof NxCloudFixTreeItem) ||
          !treeItem.runGroup.aiFix
        ) {
          return;
        }

        // Find the parent CIPE
        const cipe = recentCIPEProvider.recentCIPEInfo?.find(
          (c) => c.ciPipelineExecutionId === treeItem.cipeId,
        );
        if (!cipe) return;

        getTelemetry().logUsage('cloud.ignore-ai-fix', {
          source: 'cloud-view',
        });
        commands.executeCommand('nxCloud.ignoreAiFix', {
          cipe,
          runGroup: treeItem.runGroup,
        });
      },
    ),
    commands.registerCommand(
      'nxCloud.showAiFix',
      async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
        if (!data.runGroup.aiFix) {
          window.showErrorMessage('No Nx Cloud fix available');
          return;
        }

        if (!data.runGroup.aiFix.suggestedFix) {
          window.showErrorMessage(
            'Nx Cloud is still creating the fix. Please wait a moment and try again.',
          );
          return;
        }

        try {
          await showAiFixDiff(data.runGroup.aiFix.suggestedFix);
        } catch (error) {
          window.showErrorMessage(`Failed to show AI fix: ${error}`);
        }
      },
    ),
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
      'nxCloud.ignoreAiFix',
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
  ];
}
