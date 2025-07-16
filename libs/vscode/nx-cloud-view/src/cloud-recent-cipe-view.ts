import { CIPEInfo, CIPERun, CIPERunGroup } from '@nx-console/shared-types';
import { isCompleteStatus, isFailedStatus } from '@nx-console/shared-utils';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';
import { showErrorMessageWithOpenLogs } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  AbstractTreeProvider,
  sendMessageToAgent,
} from '@nx-console/vscode-utils';
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

        const items: BaseRecentCIPETreeItem[] = [new LabelTreeItem(label)];

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
    }

    // In Progress CIPE
    if (!this.cipe.runGroups.some((rg) => rg.runs && rg.runs.length > 0)) {
      return [
        new LabelTreeItem('CI pipeline started. Waiting for Nx tasks...'),
      ];
    }

    if (this.cipe.runGroups.length === 1) {
      return this.cipe.runGroups[0].runs.map(
        (run) =>
          new RunTreeItem(
            run,
            this.cipe.ciPipelineExecutionId,
            this.cipe.runGroups[0],
          ),
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
    return this.runGroup.runs.map(
      (run) => new RunTreeItem(run, this.cipeId, this.runGroup),
    );
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

    const fix = this.runGroup.aiFix;
    const primaryFixTaskId = fix?.taskIds[0]; // The first task ID is the primary one
    const failedTasks = this.run.failedTasks ?? [];

    // Check if this is the first run in the runGroup that has the fix task
    let isFirstRunWithFixTask = false;
    if (primaryFixTaskId && failedTasks.includes(primaryFixTaskId)) {
      // Find the first run that contains this task ID
      const firstRunWithTask = this.runGroup.runs.find((run) =>
        run.failedTasks?.includes(primaryFixTaskId),
      );
      // Only show the fix if this is the first run with the task
      isFirstRunWithFixTask =
        firstRunWithTask &&
        (firstRunWithTask.linkId === this.run.linkId ||
          firstRunWithTask.executionId === this.run.executionId);
    }

    for (const taskId of failedTasks) {
      const taskItem = new FailedTaskTreeItem(
        taskId,
        this.run.linkId,
        this.run.executionId,
        this.run,
        this.cipeId,
      );

      // Only add the fix to the first run that contains this task
      if (
        isFirstRunWithFixTask &&
        taskId === primaryFixTaskId &&
        this.runGroup.aiFix?.suggestedFixStatus !== 'NOT_STARTED'
      ) {
        taskItem.collapsibleState = TreeItemCollapsibleState.Expanded;
        taskItem.getChildren = () => [
          new NxCloudFixTreeItem(this.runGroup, this.cipeId, taskId),
        ];
      }

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

export class CloudRecentCIPEProvider extends AbstractTreeProvider<BaseRecentCIPETreeItem> {
  public recentCIPEInfo: CIPEInfo[] | undefined;
  private workspaceUrl: string | undefined;

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

      if (
        (updatedCIPEs || this.recentCIPEInfo) &&
        !isDeepStrictEqual(this.recentCIPEInfo, updatedCIPEs)
      ) {
        this.recentCIPEInfo = updatedCIPEs;
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
      return this.cipeElements;
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
      commands.registerCommand('nxCloud.helpMeFixCipeError', async () => {
        getTelemetry().logUsage('cloud.fix-cipe-error');

        const fixMePrompt = 'help me fix the latest ci pipeline error';

        sendMessageToAgent(fixMePrompt);
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
