import {
  AITaskFixValidationStatus,
  CIPEInfo,
  CIPERun,
  CIPERunGroup,
} from '@nx-console/shared-types';
import { isCompleteStatus, isFailedStatus } from '@nx-console/shared-utils';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';
import { showErrorMessageWithOpenLogs } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  AbstractTreeProvider,
  sendMessageToAgent,
  getWorkspacePath,
} from '@nx-console/vscode-utils';
import { xhr } from 'request-light';
import { join } from 'path';
import { isDeepStrictEqual } from 'util';
import {
  CancellationToken,
  commands,
  Disposable,
  ExtensionContext,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  TextDocumentContentProvider,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
} from 'vscode';
import { ActorRef, EventObject } from 'xstate';
import { formatMillis } from './format-time';
import { nxCloudAuthHeaders } from '@nx-console/shared-nx-cloud';

abstract class BaseRecentCIPETreeItem extends TreeItem {
  abstract type: 'CIPE' | 'runGroup' | 'run' | 'label' | 'failedTask';

  abstract getChildren(): ProviderResult<BaseRecentCIPETreeItem[]>;

  isCIPETreeItem(): this is CIPETreeItem {
    return this.type === 'CIPE';
  }

  isRunGroupTreeItem(): this is RunGroupTreeItem {
    return this.type === 'runGroup';
  }

  isRunTreeItem(): this is RunTreeItem {
    return this.type === 'run';
  }

  isFailedTaskTreeItem(): this is FailedTaskTreeItem {
    return this.type === 'failedTask';
  }
}

class CIPETreeItem extends BaseRecentCIPETreeItem implements Disposable {
  type = 'CIPE' as const;

  private timeoutDisposable?: Disposable;

  constructor(
    public cipe: CIPEInfo,
    private treeDataProvider: AbstractTreeProvider<BaseRecentCIPETreeItem>,
  ) {
    let title = cipe.branch;
    if (cipe.commitTitle) {
      if (/^[M,m]erge( branch)? .* into .*$/.test(cipe.commitTitle)) {
        title = `${cipe.branch} - ${cipe.commitTitle}`;
      } else {
        title = cipe.commitTitle;
      }
    }

    super(title);

    if (this.cipe.status === 'SUCCEEDED') {
      this.collapsibleState = TreeItemCollapsibleState.None;
    } else if (
      this.cipe.status === 'FAILED' ||
      this.cipe.status === 'TIMED_OUT'
    ) {
      this.collapsibleState = TreeItemCollapsibleState.Expanded;
    } else {
      this.collapsibleState = TreeItemCollapsibleState.Collapsed;
    }

    if (!isCompleteStatus(this.cipe.status)) {
      this.updateItemAfterSecond();
    }

    this.description = formatMillis(
      (cipe.completedAt ?? Date.now()) - cipe.createdAt,
    );

    this.id = cipe.ciPipelineExecutionId;
    this.setIcon();

    // Set context value based on available features
    let contextValue = 'cipe';
    if (cipe.commitUrl) {
      contextValue = 'cipe-commit';
    }
    this.contextValue = contextValue;
  }

  private updateItemAfterSecond() {
    const timeout = setInterval(() => {
      this.description = formatMillis(Date.now() - this.cipe.createdAt);
      this.treeDataProvider.refresh(this);
    }, 1000);

    this.timeoutDisposable = new Disposable(() => clearInterval(timeout));
  }

  private setIcon() {
    if (this.cipe.status === 'SUCCEEDED') {
      this.iconPath = new ThemeIcon(
        'pass',
        new ThemeColor('notebookStatusSuccessIcon.foreground'),
      );
    } else if (isFailedStatus(this.cipe.status)) {
      this.iconPath = new ThemeIcon(
        'error',
        new ThemeColor('notebookStatusErrorIcon.foreground'),
      );
    } else {
      this.iconPath = new ThemeIcon(
        'loading~spin',
        new ThemeColor('notebookStatusRunningIcon.foreground'),
      );
    }
  }

  getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    if (this.cipe.status === 'SUCCEEDED') {
      return [];
    }
    if (isCompleteStatus(this.cipe.status)) {
      let totalTasks = 0;
      let failedTasks = 0;
      let hasFailedRuns = false;
      for (const runGroup of this.cipe.runGroups) {
        for (const run of runGroup.runs) {
          totalTasks += run.numTasks ?? 0;
          failedTasks += run.numFailedTasks ?? 0;
          hasFailedRuns =
            hasFailedRuns || (!!run.status && isFailedStatus(run.status));
        }
      }

      if (hasFailedRuns) {
        const label =
          failedTasks > 0
            ? `${failedTasks}/${totalTasks} tasks failed. Failed Runs:`
            : 'Failed Runs:';

        return [
          new LabelTreeItem(label),
          ...this.cipe.runGroups.flatMap((runGroup) =>
            runGroup.runs
              .filter((run) => run.status && isFailedStatus(run.status))
              .map(
                (run) => new RunTreeItem(run, this.cipe.ciPipelineExecutionId),
              ),
          ),
        ];
      }
    }

    // In Progress CIPE
    if (!this.cipe.runGroups.some((rg) => rg.runs && rg.runs.length > 0)) {
      return [
        new LabelTreeItem('CI pipeline started. Waiting for Nx tasks...'),
      ];
    }

    if (this.cipe.runGroups.length === 1) {
      return this.cipe.runGroups[0].runs.map(
        (run) => new RunTreeItem(run, this.cipe.ciPipelineExecutionId),
      );
    } else {
      return this.cipe.runGroups.map((runGroup) => {
        return new RunGroupTreeItem(runGroup, this.cipe.ciPipelineExecutionId);
      });
    }
  }

  dispose(): void {
    this.timeoutDisposable?.dispose();
  }
}

class RunGroupTreeItem extends BaseRecentCIPETreeItem {
  type = 'runGroup' as const;

  constructor(
    public runGroup: CIPERunGroup,
    public cipeId: string,
  ) {
    super(runGroup.ciExecutionEnv ?? runGroup.runGroup);

    this.collapsibleState = TreeItemCollapsibleState.Expanded;
    this.id = `${cipeId}-${runGroup.runGroup}`;
    this.contextValue = 'runGroup';

    this.iconPath = new ThemeIcon('list-selection');

    this.resourceUri = Uri.from({
      scheme: 'rungroup',
      path: cipeId,
      query: runGroup.runGroup,
    });
  }

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    if (this.runGroup.runs.length === 0) {
      return [new LabelTreeItem('Waiting for Nx tasks...')];
    }
    return this.runGroup.runs.map((run) => new RunTreeItem(run, this.cipeId));
  }
}

class RunTreeItem extends BaseRecentCIPETreeItem {
  type = 'run' as const;

  constructor(
    public run: CIPERun,
    public cipeId: string,
  ) {
    super(run.command);

    this.collapsibleState = this.run.numFailedTasks
      ? TreeItemCollapsibleState.Expanded
      : TreeItemCollapsibleState.None;
    this.id = `${cipeId}-${run.linkId ?? run.executionId}`;
    this.setIcon();

    this.contextValue = 'run';
  }

  private setIcon() {
    if (
      this.run.status === null ||
      this.run.status === undefined ||
      !isCompleteStatus(this.run.status)
    ) {
      this.iconPath = new ThemeIcon(
        'loading~spin',
        new ThemeColor('notebookStatusRunningIcon.foreground'),
      );
    } else if (this.run.status === 'SUCCEEDED') {
      this.iconPath = new ThemeIcon(
        'pass',
        new ThemeColor('notebookStatusSuccessIcon.foreground'),
      );
    } else if (isFailedStatus(this.run.status)) {
      this.iconPath = new ThemeIcon(
        'error',
        new ThemeColor('notebookStatusErrorIcon.foreground'),
      );
    }
  }

  override getChildren(): ProviderResult<FailedTaskTreeItem[]> {
    if (this.run.failedTasks && this.run.failedTasks.length > 0) {
      return this.run.failedTasks.map((taskId) => {
        return new FailedTaskTreeItem(
          taskId,
          this.run.linkId,
          this.run.executionId,
          this.run,
          this.cipeId,
        );
      });
    }

    return [];
  }
}

class FailedTaskTreeItem extends BaseRecentCIPETreeItem {
  type = 'failedTask' as const;

  constructor(
    public taskId: string,
    public linkId?: string,
    public executionId?: string,
    public run?: CIPERun,
    public cipeId?: string,
  ) {
    super(taskId);
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.contextValue = 'failedTask';

    // Set context value based on AI fix state
    const aiTaskFix = this.run?.aiTaskFix;
    if (aiTaskFix) {
      this.contextValue += '-aifix';

      // Check user action first
      const userAction = aiTaskFix.userAction;
      if (userAction === 'APPLIED') {
        this.contextValue += '-applied';
        this.description = 'Fix Applied';
        this.tooltip = `${this.taskId}\nNx Cloud Fix Applied`;
        this.iconPath = new ThemeIcon(
          'check',
          new ThemeColor('notebookStatusSuccessIcon.foreground'),
        );
        return;
      } else if (userAction === 'REJECTED') {
        this.contextValue += '-rejected';
        this.description = 'Fix Ignored';
        this.tooltip = `${this.taskId}\nNx Cloud Fix Ignored`;
        this.iconPath = new ThemeIcon(
          'close',
          new ThemeColor('notebookStatusErrorIcon.foreground'),
        );
        return;
      }

      // If userAction is NONE, proceed with normal validation status logic
      // Determine the specific state based on fix creation and validation flow
      const hasFix = !!aiTaskFix.suggestedFix;
      const validationStatus = aiTaskFix.validationStatus;

      if (hasFix) {
        // Fix has been created - show different states based on validation
        this.contextValue += '-hasFix';
        switch (validationStatus) {
          case 'NOT_STARTED':
            this.contextValue += '-notValidated';
            this.description = 'Fix Ready';
            break;
          case 'IN_PROGRESS':
            this.contextValue += '-validating';
            this.description = 'Validating Fix';
            break;
          case 'COMPLETED':
            this.contextValue += '-validated';
            this.description = 'Fix Validated';
            break;
          case 'FAILED':
            this.contextValue += '-validationFailed';
            this.description = 'Validation Failed';
            break;
        }
      } else {
        // No fix yet - we're still creating it
        switch (validationStatus) {
          case 'NOT_STARTED':
            this.contextValue += '-creatingFix';
            this.description = 'Creating Fix';
            break;
          case 'IN_PROGRESS':
            this.contextValue += '-creatingFix';
            this.description = 'Creating Fix';
            break;
          case 'COMPLETED':
            // This shouldn't happen - if fix creation completed, there should be a suggested fix
            this.contextValue += '-fixFailed';
            this.description = 'Fix Failed';
            break;
          case 'FAILED':
            this.contextValue += '-fixFailed';
            this.description = 'Fix Failed';
            break;
        }
      }

      // Set tooltip with detailed status
      const statusLabels: Record<AITaskFixValidationStatus, string> = {
        NOT_STARTED: hasFix
          ? 'Nx Cloud Fix Created - Ready for Validation'
          : 'Nx Cloud Creating Fix',
        IN_PROGRESS: hasFix
          ? 'Nx Cloud Validating Fix'
          : 'Nx Cloud Creating Fix',
        COMPLETED: 'Nx Cloud validated the fix Successfully',
        FAILED: 'Nx Cloud Fix Validation Failed',
      };

      const statusLabel = statusLabels[validationStatus] || validationStatus;
      this.tooltip = `${this.taskId}\n${statusLabel}`;

      // Set icon based on AI fix state
      if (!hasFix) {
        // Show loading spinner when creating fix
        this.iconPath = new ThemeIcon(
          'loading~spin',
          new ThemeColor('notebookStatusRunningIcon.foreground'),
        );
      } else if (validationStatus === 'IN_PROGRESS') {
        // Show loading spinner when validating fix
        this.iconPath = new ThemeIcon(
          'loading~spin',
          new ThemeColor('notebookStatusRunningIcon.foreground'),
        );
      } else {
        // Default error icon for all other states
        this.iconPath = new ThemeIcon('error');
      }
    } else {
      // No AI fix - use default error icon
      this.iconPath = new ThemeIcon('error');
    }
  }

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    return [];
  }
}

class LabelTreeItem extends BaseRecentCIPETreeItem {
  type = 'label' as const;

  constructor(label: string) {
    super(label);
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.contextValue = 'label';
  }

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    return [];
  }
}

class AiFixDiffContentProvider implements TextDocumentContentProvider {
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

export class CloudRecentCIPEProvider extends AbstractTreeProvider<BaseRecentCIPETreeItem> {
  private recentCIPEInfo: CIPEInfo[] | undefined;
  private workspaceUrl: string | undefined;

  private cipeElements?: CIPETreeItem[];

  constructor(
    actor: ActorRef<any, EventObject>,
    private fileDecorationProvider: CIPEFileDecorationProvider,
  ) {
    super();

    actor.subscribe((state) => {
      this.workspaceUrl = state.context.workspaceUrl;
      const updatedCIPEs = state.context.recentCIPEs;

      if (
        (updatedCIPEs || this.recentCIPEInfo) &&
        !isDeepStrictEqual(this.recentCIPEInfo, updatedCIPEs)
      ) {
        this.recentCIPEInfo = updatedCIPEs;
        this.refresh();
      }
    });
  }
  override getChildren(
    element?: BaseRecentCIPETreeItem | undefined,
  ): ProviderResult<BaseRecentCIPETreeItem[]> {
    if (!this.recentCIPEInfo) {
      return undefined;
    }

    this.fileDecorationProvider.recentCIPEInfo = this.recentCIPEInfo;

    if (!element) {
      this.cipeElements?.forEach((el) => el.dispose());

      this.cipeElements = this.recentCIPEInfo
        .map((cipe) => new CIPETreeItem(cipe, this))
        .sort((a, b) => {
          return b.cipe.createdAt - a.cipe.createdAt;
        });
      return this.cipeElements;
    }

    return element.getChildren();
  }
  override getParent(
    _: BaseRecentCIPETreeItem,
  ): ProviderResult<BaseRecentCIPETreeItem | null | undefined> {
    return undefined;
  }

  static create(
    extensionContext: ExtensionContext,
    actor: ActorRef<any, EventObject>,
  ) {
    const fileDecorationProvider = new CIPEFileDecorationProvider();
    const recentCIPEProvider = new CloudRecentCIPEProvider(
      actor,
      fileDecorationProvider,
    );

    // Register content providers for virtual diff documents
    const aiFixDiffContentProvider = new AiFixDiffContentProvider();
    extensionContext.subscriptions.push(
      workspace.registerTextDocumentContentProvider(
        'nx-cloud-fix-before',
        aiFixDiffContentProvider,
      ),
      workspace.registerTextDocumentContentProvider(
        'nx-cloud-fix-after',
        aiFixDiffContentProvider,
      ),
    );

    extensionContext.subscriptions.push(
      window.registerFileDecorationProvider(fileDecorationProvider),
      window.createTreeView('nxCloudRecentCIPE', {
        treeDataProvider: recentCIPEProvider,
      }),
      commands.registerCommand(
        'nxCloud.showCIPEInApp',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isCIPETreeItem()) {
            return;
          }
          getTelemetry().logUsage('cloud.view-cipe', {
            source: 'cloud-view',
          });
          commands.executeCommand('vscode.open', treeItem.cipe.cipeUrl);
        },
      ),
      commands.registerCommand(
        'nxCloud.showRunInApp',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isRunTreeItem()) {
            return;
          }
          getTelemetry().logUsage('cloud.view-run', {
            source: 'cloud-view',
          });
          commands.executeCommand('vscode.open', treeItem.run.runUrl);
        },
      ),
      commands.registerCommand(
        'nxCloud.showCommitForCIPE',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isCIPETreeItem()) {
            return;
          }
          if (treeItem.cipe.commitUrl) {
            getTelemetry().logUsage('cloud.view-cipe-commit', {
              source: 'cloud-view',
            });
            commands.executeCommand('vscode.open', treeItem.cipe.commitUrl);
          }
        },
      ),
      commands.registerCommand('nxCloud.openApp', async () => {
        if (recentCIPEProvider.workspaceUrl) {
          getTelemetry().logUsage('cloud.open-app');
          commands.executeCommand(
            'vscode.open',
            recentCIPEProvider.workspaceUrl,
          );
        } else {
          // this shouldn't happen but as a fallback, we try to guess the cloud url
          const info = await getNxCloudStatus();

          if (info?.nxCloudUrl) {
            const baseUrl = info.nxCloudId
              ? `${info.nxCloudUrl}/workspaces/${info.nxCloudId}`
              : info.nxCloudUrl;
            getTelemetry().logUsage('cloud.open-app');
            const cloudUrlWithTracking = `${baseUrl}?utm_campaign=open-cloud-app&utm_medium=cloud-promo&utm_source=nxconsole`;
            commands.executeCommand('vscode.open', cloudUrlWithTracking);
          } else {
            showErrorMessageWithOpenLogs(
              'Something went wrong while retrieving the Nx Cloud URL.',
            );
          }
        }
      }),
      commands.registerCommand(
        'nxCloud.explainCipeTaskFailure',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isFailedTaskTreeItem()) {
            return;
          }

          getTelemetry().logUsage('cloud.explain-cipe-error');

          let idPrompt = '';
          if (treeItem.linkId) {
            idPrompt += `linkId ${treeItem.linkId}`;
          }
          if (treeItem.executionId) {
            idPrompt += ` executionId ${treeItem.executionId}`;
          }

          commands.executeCommand(
            'workbench.action.chat.open',
            `@nx /explain-cipe help me understand the failed output for ${treeItem.taskId} with the following ids ${idPrompt}`,
          );
        },
      ),
      commands.registerCommand(
        'nxCloud.showAiTaskFixFromTree',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isFailedTaskTreeItem() || !treeItem.run?.aiTaskFix) {
            return;
          }

          // Find the parent CIPE
          const cipe = recentCIPEProvider.recentCIPEInfo?.find(
            (c) => c.ciPipelineExecutionId === treeItem.cipeId,
          );
          if (!cipe) return;

          getTelemetry().logUsage('cloud.show-ai-task-fix', {
            source: 'cloud-view',
          });
          commands.executeCommand('nxCloud.showAiTaskFix', {
            cipe,
            run: treeItem.run,
          });
        },
      ),
      commands.registerCommand(
        'nxCloud.applyAiTaskFixFromTree',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isFailedTaskTreeItem() || !treeItem.run?.aiTaskFix) {
            return;
          }

          // Find the parent CIPE
          const cipe = recentCIPEProvider.recentCIPEInfo?.find(
            (c) => c.ciPipelineExecutionId === treeItem.cipeId,
          );
          if (!cipe) return;

          getTelemetry().logUsage('cloud.apply-ai-task-fix', {
            source: 'cloud-view',
          });
          commands.executeCommand('nxCloud.applyAiTaskFix', {
            cipe,
            run: treeItem.run,
          });
        },
      ),
      commands.registerCommand(
        'nxCloud.ignoreAiTaskFixFromTree',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem.isFailedTaskTreeItem() || !treeItem.run?.aiTaskFix) {
            return;
          }

          // Find the parent CIPE
          const cipe = recentCIPEProvider.recentCIPEInfo?.find(
            (c) => c.ciPipelineExecutionId === treeItem.cipeId,
          );
          if (!cipe) return;

          getTelemetry().logUsage('cloud.ignore-ai-task-fix', {
            source: 'cloud-view',
          });
          commands.executeCommand('nxCloud.ignoreAiTaskFix', {
            cipe,
            run: treeItem.run,
          });
        },
      ),
      commands.registerCommand('nxCloud.helpMeFixCipeError', async () => {
        getTelemetry().logUsage('cloud.fix-cipe-error');

        const fixMePrompt = 'help me fix the latest ci pipeline error';

        sendMessageToAgent(fixMePrompt);
      }),
      commands.registerCommand(
        'nxCloud.showAiTaskFix',
        async (data: { cipe: CIPEInfo; run: CIPERun }) => {
          if (!data.run.aiTaskFix) {
            window.showErrorMessage('No Nx Cloud fix available');
            return;
          }

          if (!data.run.aiTaskFix.suggestedFix) {
            window.showErrorMessage(
              'Nx Cloud is still creating the fix. Please wait a moment and try again.',
            );
            return;
          }

          try {
            await showAiFixDiff(data.run.aiTaskFix.suggestedFix);
          } catch (error) {
            window.showErrorMessage(`Failed to show AI fix: ${error}`);
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.applyAiTaskFix',
        async (data: { cipe: CIPEInfo; run: CIPERun }) => {
          if (!data.run.aiTaskFix?.suggestedFix) {
            window.showErrorMessage('No AI fix available to apply');
            return;
          }

          const aiTaskFixId = data.run.aiTaskFix.aiTaskFixId;
          if (!aiTaskFixId) {
            window.showErrorMessage('AI fix ID not found');
            return;
          }

          const success = await updateSuggestedFix(aiTaskFixId, 'APPLIED');
          if (success) {
            window.showInformationMessage('Nx Cloud fix applied successfully');
            commands.executeCommand('nxCloud.refresh');
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.ignoreAiTaskFix',
        async (data: { cipe: CIPEInfo; run: CIPERun }) => {
          if (!data.run.aiTaskFix) {
            window.showErrorMessage('No AI fix available to ignore');
            return;
          }

          const aiTaskFixId = data.run.aiTaskFix.aiTaskFixId;
          if (!aiTaskFixId) {
            window.showErrorMessage('AI fix ID not found');
            return;
          }

          const success = await updateSuggestedFix(aiTaskFixId, 'REJECTED');
          if (success) {
            window.showInformationMessage('Nx Cloud fix ignored');
            commands.executeCommand('nxCloud.refresh');
          }
        },
      ),
    );
  }
}

class CIPEFileDecorationProvider implements FileDecorationProvider {
  public recentCIPEInfo: CIPEInfo[] | undefined;
  provideFileDecoration(uri: Uri): ProviderResult<FileDecoration> {
    if (uri.scheme === 'rungroup') {
      const cipeId = uri.path;
      const runGroupId = uri.query;

      const runGroup = this.recentCIPEInfo
        ?.find((cipe) => cipe.ciPipelineExecutionId === cipeId)
        ?.runGroups.find((rg) => rg.runGroup === runGroupId);

      const failedTasks = runGroup?.runs.reduce(
        (total, run) => total + (run.numFailedTasks ?? 0),
        0,
      );
      const totalTasks = runGroup?.runs.reduce(
        (total, run) => total + (run.numTasks ?? 0),
        0,
      );

      if (failedTasks && failedTasks > 0) {
        return {
          badge: failedTasks.toString(),
          color: new ThemeColor('notificationsErrorIcon.foreground'),
          tooltip: `${failedTasks}/${totalTasks} tasks failed`,
          propagate: false,
        };
      }
    }

    return undefined;
  }
}

async function updateSuggestedFix(
  aiTaskFixId: string,
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
        aiTaskFixId,
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
