import { CIPEInfo, CIPERun, CIPERunGroup } from '@nx-console/shared-types';
import { isCompleteStatus, isFailedStatus } from '@nx-console/shared-utils';
import { AbstractTreeProvider, isInCursor } from '@nx-console/vscode-utils';
import { isDeepStrictEqual } from 'util';
import {
  commands,
  Disposable,
  env,
  ExtensionContext,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
} from 'vscode';
import { ActorRef, EventObject } from 'xstate';
import { formatMillis } from './format-time';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { showErrorMessageWithOpenLogs } from '@nx-console/vscode-output-channels';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';

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
    this.contextValue = cipe.commitUrl ? 'cipe-commit' : 'cipe';
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
  ) {
    super(taskId);
    this.collapsibleState = TreeItemCollapsibleState.None;
    this.iconPath = new ThemeIcon('error');
    this.contextValue = 'failedTask';
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
    element: BaseRecentCIPETreeItem,
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
      commands.registerCommand('nxCloud.helpMeFixCipeError', async () => {
        getTelemetry().logUsage('cloud.fix-cipe-error');

        const fixMePrompt = 'help me fix the latest ci pipeline error';

        if (isInCursor()) {
          commands.executeCommand('composer.newAgentChat');
          await new Promise((resolve) => setTimeout(resolve, 150));
          const originalClipboard = await env.clipboard.readText();
          await env.clipboard.writeText(fixMePrompt);
          await commands.executeCommand('editor.action.clipboardPasteAction');
          await env.clipboard.writeText(originalClipboard);
        } else {
          commands.executeCommand('workbench.action.chat.open', {
            mode: 'agent',
            query: fixMePrompt,
            isPartialQuery: true,
          });
          await commands.executeCommand('workbench.action.chat.sendToNewChat');
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
