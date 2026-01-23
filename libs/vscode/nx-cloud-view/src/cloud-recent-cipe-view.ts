import {
  CIPEInfo,
  CIPEInfoError,
  CIPERun,
  CIPERunGroup,
} from '@nx-console/shared-types';
import { isCompleteStatus, isFailedStatus } from '@nx-console/shared-utils';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';
import { showErrorMessageWithOpenLogs } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { AbstractTreeProvider } from '@nx-console/vscode-utils';
import { isDeepStrictEqual } from 'util';
import {
  commands,
  Disposable,
  ExtensionContext,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeItemCollapsibleState,
  TreeView,
  Uri,
  window,
} from 'vscode';
import { ActorRef, EventObject } from 'xstate';
import {
  BaseRecentCIPETreeItem,
  CIPETreeItem as CIPETreeItemInterface,
  FailedTaskTreeItem as FailedTaskTreeItemInterface,
  RunGroupTreeItem as RunGroupTreeItemInterface,
  RunTreeItem as RunTreeItemInterface,
} from './base-tree-item';
import { formatMillis } from './format-time';
import { NxCloudFixTreeItem } from './nx-cloud-fix-tree-item';

export class CIPETreeItem
  extends BaseRecentCIPETreeItem
  implements CIPETreeItemInterface, Disposable
{
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
    this.tooltip = cipe.branch;

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

        const items: BaseRecentCIPETreeItem[] = [];

        // Add AI fixes first if they exist (show run group ID if multiple run groups with ai fixes exist)
        const multipleAiFixes =
          this.cipe.runGroups.filter((rg) => rg.aiFix).length > 1;
        for (const runGroup of this.cipe.runGroups) {
          if (runGroup.aiFix) {
            items.push(
              new NxCloudFixTreeItem(
                runGroup,
                this.cipe.ciPipelineExecutionId,
                multipleAiFixes,
              ),
            );
          }
        }

        // Add label after AI fixes
        items.push(new LabelTreeItem(label));

        // Add failed runs
        items.push(
          ...this.cipe.runGroups.flatMap((runGroup) =>
            runGroup.runs
              .filter((run) => run.status && isFailedStatus(run.status))
              .map(
                (run) =>
                  new RunTreeItem(
                    run,
                    this.cipe.ciPipelineExecutionId,
                    runGroup,
                  ),
              ),
          ),
        );

        return items;
      }

      // Pipeline completed but no runs have failed status - check if there are any runs at all
      if (!this.cipe.runGroups.some((rg) => rg.runs && rg.runs.length > 0)) {
        const statusMessage =
          this.cipe.status === 'CANCELED'
            ? 'CI pipeline was canceled'
            : this.cipe.status === 'TIMED_OUT'
              ? 'CI pipeline timed out'
              : 'CI pipeline failed';
        return [new LabelTreeItem(statusMessage)];
      }
      // If there are runs but none failed, fall through to show them
    }

    // In Progress CIPE
    if (!this.cipe.runGroups.some((rg) => rg.runs && rg.runs.length > 0)) {
      return [
        new LabelTreeItem('CI pipeline started. Waiting for Nx tasks...'),
      ];
    }

    if (this.cipe.runGroups.length === 1) {
      const runGroup = this.cipe.runGroups[0];
      const children: BaseRecentCIPETreeItem[] = [];

      // Add AI fix first if it exists for single run group (no need to show run group ID since there's only one)
      if (runGroup.aiFix) {
        children.push(
          new NxCloudFixTreeItem(runGroup, this.cipe.ciPipelineExecutionId),
        );
      }

      // Add runs after AI fix
      children.push(
        ...runGroup.runs.map(
          (run) =>
            new RunTreeItem(run, this.cipe.ciPipelineExecutionId, runGroup),
        ),
      );

      return children;
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

export class RunGroupTreeItem
  extends BaseRecentCIPETreeItem
  implements RunGroupTreeItemInterface
{
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

    const children: BaseRecentCIPETreeItem[] = [];

    // Add AI fix first if it exists
    if (this.runGroup.aiFix) {
      children.push(new NxCloudFixTreeItem(this.runGroup, this.cipeId));
    }

    // Add runs after AI fix
    children.push(
      ...this.runGroup.runs.map(
        (run) => new RunTreeItem(run, this.cipeId, this.runGroup),
      ),
    );

    return children;
  }
}

export class RunTreeItem
  extends BaseRecentCIPETreeItem
  implements RunTreeItemInterface
{
  type = 'run' as const;

  constructor(
    public run: CIPERun,
    public cipeId: string,
    public runGroup: CIPERunGroup,
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

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    const children: BaseRecentCIPETreeItem[] = [];
    const failedTasks = this.run.failedTasks ?? [];

    for (const taskId of failedTasks) {
      const taskItem = new FailedTaskTreeItem(
        taskId,
        this.run.linkId,
        this.run.executionId,
        this.run,
        this.cipeId,
      );

      children.push(taskItem);
    }

    // Adjust collapsible state based on children having tasks
    this.collapsibleState =
      failedTasks.length > 0
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None;

    return children;
  }
}

export class FailedTaskTreeItem
  extends BaseRecentCIPETreeItem
  implements FailedTaskTreeItemInterface
{
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
    this.iconPath = new ThemeIcon('error');
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

class ConnectionErrorTreeItem extends BaseRecentCIPETreeItem {
  type = 'connectionError' as const;

  constructor() {
    super('Unable to connect to Nx Cloud');
    this.description = 'Check your connection';
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.contextValue = 'connectionError';
    this.iconPath = new ThemeIcon(
      'warning',
      new ThemeColor('list.warningForeground'),
    );
    this.tooltip =
      'Could not connect to Nx Cloud API. Some features may be limited.';
  }

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    return [];
  }
}

class CIPEErrorTreeItem extends BaseRecentCIPETreeItem {
  type = 'cipeError' as const;

  constructor(
    private errorType: 'network' | 'authentication' | 'other',
    private errorMessage: string,
  ) {
    super(
      errorType === 'network'
        ? 'Network error accessing Nx Cloud'
        : errorType === 'authentication'
          ? 'Authentication error'
          : 'Error accessing Nx Cloud',
    );
    this.description =
      errorType === 'network'
        ? 'Check connection'
        : errorType === 'authentication'
          ? 'Login required'
          : 'Click to view details';
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.contextValue = `cipeError-${errorType}`;
    this.iconPath = new ThemeIcon(
      errorType === 'network' ? 'cloud-offline' : 'error',
      new ThemeColor('list.errorForeground'),
    );
    this.tooltip = errorMessage;
  }

  override getChildren(): ProviderResult<BaseRecentCIPETreeItem[]> {
    return [];
  }
}

export class CloudRecentCIPEProvider extends AbstractTreeProvider<BaseRecentCIPETreeItem> {
  public recentCIPEInfo: CIPEInfo[] | undefined;
  private workspaceUrl: string | undefined;
  private claimCheckFailed = false;
  private cipeError: CIPEInfoError | undefined;

  private cipeElements?: CIPETreeItem[];
  private static treeView: TreeView<BaseRecentCIPETreeItem> | undefined;

  constructor(
    actor: ActorRef<any, EventObject>,
    private fileDecorationProvider: CIPEFileDecorationProvider,
  ) {
    super();

    actor.subscribe((state) => {
      this.workspaceUrl = state.context.workspaceUrl;
      const updatedCIPEs = state.context.recentCIPEs;
      const updatedClaimCheckFailed =
        state.context.onboardingInfo?.isWorkspaceClaimed === undefined;
      const updatedCIPEError = state.context.cipeError;

      if (
        (updatedCIPEs || this.recentCIPEInfo) &&
        (!isDeepStrictEqual(this.recentCIPEInfo, updatedCIPEs) ||
          updatedClaimCheckFailed !== this.claimCheckFailed ||
          !isDeepStrictEqual(this.cipeError, updatedCIPEError))
      ) {
        this.recentCIPEInfo = updatedCIPEs;
        this.claimCheckFailed = updatedClaimCheckFailed;
        this.cipeError = updatedCIPEError;
        this.refresh();
        CloudRecentCIPEProvider.updateTreeViewBadge(updatedCIPEs);
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

      const items: BaseRecentCIPETreeItem[] = [];

      // Show CIPE error if there is one
      if (this.cipeError) {
        items.push(
          new CIPEErrorTreeItem(this.cipeError.type, this.cipeError.message),
        );
      }

      // Show connection error if we have CIPEs to display
      if (this.claimCheckFailed && this.cipeElements.length > 0) {
        items.push(new ConnectionErrorTreeItem());
      }

      // Add CIPE items
      items.push(...this.cipeElements);

      return items.length > 0 ? items : this.cipeElements;
    }

    return element.getChildren();
  }
  override getParent(
    _: BaseRecentCIPETreeItem,
  ): ProviderResult<BaseRecentCIPETreeItem | null | undefined> {
    return undefined;
  }

  static updateTreeViewBadge(cipeData: CIPEInfo[] | null) {
    if (!CloudRecentCIPEProvider.treeView) {
      return;
    }

    // Count AI fixes that haven't been acted upon
    let aiFixCount = 0;
    if (cipeData) {
      for (const cipe of cipeData) {
        for (const runGroup of cipe.runGroups || []) {
          if (
            runGroup.aiFix?.suggestedFix &&
            runGroup.aiFix.userAction === 'NONE'
          ) {
            aiFixCount++;
          }
        }
      }
    }

    CloudRecentCIPEProvider.treeView.badge =
      aiFixCount > 0
        ? {
            value: aiFixCount,
            tooltip:
              aiFixCount === 1
                ? '1 AI fix available'
                : `${aiFixCount} AI fixes available`,
          }
        : undefined;
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

    // Store tree view reference for badge updates
    CloudRecentCIPEProvider.treeView = window.createTreeView(
      'nxCloudRecentCIPE',
      {
        treeDataProvider: recentCIPEProvider,
      },
    );

    extensionContext.subscriptions.push(
      window.registerFileDecorationProvider(fileDecorationProvider),
      CloudRecentCIPEProvider.treeView,
      CloudRecentCIPEProvider.treeView.onDidChangeVisibility((e) => {
        if (e.visible) {
          commands.executeCommand('nxCloud.refresh');
        }
      }),
      commands.registerCommand(
        'nxCloud.showCIPEInApp',
        async (treeItem: BaseRecentCIPETreeItem) => {
          if (!treeItem || !treeItem.isCIPETreeItem()) {
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
          if (!treeItem || !treeItem.isCIPETreeItem()) {
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
