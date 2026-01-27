import {
  downloadAndExtractArtifact,
  updateSuggestedFix as updateSuggestedFixShared,
  UpdateSuggestedFixAction,
} from '@nx-console/shared-nx-cloud';
import {
  CIPEInfo,
  CIPERunGroup,
  NxCloudFixDetails,
  NxCloudFixMessage,
} from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  logAndShowError,
  vscodeLogger,
} from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  applyFixLocallyWithGit,
  applyFixLocallyWithNxCloud,
} from './apply-fix-locally';
import {
  getGitApi,
  getGitBranch,
  getGitHasUncommittedChanges,
  getWorkspacePath,
  safeJsonStringify,
} from '@nx-console/vscode-utils';
import { execSync } from 'child_process';
import { join } from 'path';
import {
  commands,
  EventEmitter,
  ExtensionContext,
  Tab,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
} from 'vscode';
import { ActorRef, EventObject } from 'xstate';
import { getAiFixStatusBarService } from './ai-fix-status-bar-service';
import { DiffContentProvider, parseGitDiff } from './diffs/diff-provider';
import { createUnifiedDiffView } from './nx-cloud-fix-tree-item';

export class NxCloudFixWebview {
  private webviewPanel: WebviewPanel | undefined;
  private readonly _onDispose = new EventEmitter<void>();
  private currentFixDetails: NxCloudFixDetails | undefined;

  constructor(private context: ExtensionContext) {}

  get onDispose() {
    return this._onDispose.event;
  }

  async showFixDetails(details: NxCloudFixDetails) {
    this.currentFixDetails = details;

    if (!this.webviewPanel) {
      this.createWebviewPanel();
    }

    this.updateWebviewContent();
    this.webviewPanel?.reveal();

    // Open the diff view in a split panel only if the fix is ready
    if (details.runGroup.aiFix?.suggestedFix) {
      await this.showDiffInSplitPanel(details.runGroup.aiFix.suggestedFix);
    }
  }

  async updateFixDetailsFromRecentCIPEs(recentCIPEs: CIPEInfo[]) {
    if (!this.currentFixDetails) return;

    const updatedDetails = recentCIPEs.find(
      (cipe) =>
        cipe.ciPipelineExecutionId ===
        this.currentFixDetails.cipe.ciPipelineExecutionId,
    );

    if (updatedDetails) {
      // Find the corresponding runGroup in the updated CIPE
      const updatedRunGroup = updatedDetails.runGroups.find(
        (rg) => rg.runGroup === this.currentFixDetails.runGroup.runGroup,
      );

      if (updatedRunGroup) {
        this.currentFixDetails = {
          ...this.currentFixDetails,
          cipe: updatedDetails,
          runGroup: updatedRunGroup,
        };
      }
    }

    if (this.webviewPanel) {
      this.updateWebviewContent();
    }
  }

  private createWebviewPanel() {
    this.webviewPanel = window.createWebviewPanel(
      'nxCloudFix',
      'Nx Cloud Fix Details',
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    this.webviewPanel.webview.onDidReceiveMessage(
      async (message: NxCloudFixMessage) => {
        await this.handleWebviewMessage(message);
      },
    );

    this.webviewPanel.onDidDispose(async () => {
      this.webviewPanel = undefined;
      this.currentFixDetails = undefined;
      this._onDispose.fire();

      // Close the diff tab associated with this fix
      await closeCloudFixDiffTab();
    });

    this.webviewPanel.webview.html = this.getWebviewHtml(
      this.currentFixDetails,
    );
  }

  private async handleWebviewMessage(message: NxCloudFixMessage) {
    if (!this.currentFixDetails) return;

    switch (message.type) {
      case 'apply':
        await commands.executeCommand(
          'nxCloud.applyAiFix',
          this.currentFixDetails,
          message.commitMessage,
        );
        this.webviewPanel?.dispose();
        break;
      case 'reject':
        await commands.executeCommand(
          'nxCloud.rejectAiFix',
          this.currentFixDetails,
        );
        this.webviewPanel?.dispose();
        break;
      case 'show-diff':
        if (this.currentFixDetails.runGroup.aiFix?.suggestedFix) {
          await this.showDiffInSplitPanel(
            this.currentFixDetails.runGroup.aiFix.suggestedFix,
          );
        }
        break;
      case 'apply-locally':
        await commands.executeCommand(
          'nxCloud.applyAiFixLocally',
          this.currentFixDetails,
        );
        this.webviewPanel?.dispose();
        break;
      case 'rerun-ci':
        await commands.executeCommand(
          'nxCloud.rerunCi',
          this.currentFixDetails,
        );
        this.webviewPanel?.dispose();
        break;
    }
  }

  async updateWebviewContent() {
    if (!this.webviewPanel || !this.currentFixDetails) return;

    const hasUncommittedChanges = await getGitHasUncommittedChanges();

    this.webviewPanel.webview.postMessage({
      type: 'update-details',
      details: {
        ...this.currentFixDetails,
        hasUncommittedChanges,
      },
    });
  }

  private getWebviewHtml(details: NxCloudFixDetails): string {
    const webviewScriptUri = this.webviewPanel?.webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'cloud-fix-webview', 'main.js'),
    );

    const codiconsUri = this.webviewPanel?.webview.asWebviewUri(
      Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        '@vscode',
        'codicons',
        'dist',
        'codicon.css',
      ),
    );

    const tailwindCssUri = this.webviewPanel?.webview.asWebviewUri(
      Uri.joinPath(
        this.context.extensionUri,
        'cloud-fix-webview',
        'tailwind.css',
      ),
    );

    const mainCssUri = this.webviewPanel?.webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'cloud-fix-webview', 'main.css'),
    );

    const vscodeElementsUri = this.webviewPanel?.webview.asWebviewUri(
      Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        '@vscode-elements',
        'elements',
        'dist',
        'bundled.js',
      ),
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet">
        <link href="${mainCssUri}" rel="stylesheet">
        <link href="${tailwindCssUri}" rel="stylesheet">
         <style>
            :root {
              font-size: var(--vscode-font-size);
            }
            body {
              padding: 0;
            }
         </style>
        <title>Nx Cloud Fix Details</title>
        <script src="${vscodeElementsUri}" type="module"></script>
      </head>
      <body>
        <script type="module" src="${webviewScriptUri}"></script>
        <script>
          globalThis.fixDetails = ${safeJsonStringify(details)};
        </script>
        <root-nx-cloud-fix-element></root-nx-cloud-fix-element>
      </body>
      </html>`;
  }

  private async showDiffInSplitPanel(gitDiff: string) {
    // Parse the git diff to extract file changes
    const parsedDiff = parseGitDiff(gitDiff);

    if (parsedDiff.length === 0) {
      // If we can't parse the diff, fall back to showing raw diff
      const doc = await workspace.openTextDocument({
        content: gitDiff,
        language: 'diff',
      });
      await window.showTextDocument(doc, {
        viewColumn: ViewColumn.Beside,
        preview: false,
      });
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
      DiffContentProvider.setContent(
        beforeUri.toString(),
        fileDiff.beforeContent,
      );
      DiffContentProvider.setContent(
        afterUri.toString(),
        fileDiff.afterContent,
      );

      // Create the resource URI that points to the REAL workspace file
      const absoluteFilePath = join(workspacePath, fileDiff.fileName);
      const resourceUri = Uri.file(absoluteFilePath);

      // Add to the changes array: [resourceUri, originalUri, modifiedUri]
      changeUris.push([resourceUri, beforeUri, afterUri]);
    }

    // Try to open with the MultiDiffEditor command in the beside column
    try {
      const title = `Nx Cloud Fix (${parsedDiff.length} file${parsedDiff.length === 1 ? '' : 's'})`;

      // First focus the beside column
      await commands.executeCommand('workbench.action.focusSecondEditorGroup');

      // Then open the multi-diff in that column
      await commands.executeCommand('vscode.changes', title, changeUris);
      console.log('MultiDiffEditor opened successfully');
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
      DiffContentProvider.setContent(
        beforeUri.toString(),
        unifiedDiff.beforeContent,
      );
      DiffContentProvider.setContent(
        afterUri.toString(),
        unifiedDiff.afterContent,
      );

      // Show the unified diff in the beside column
      const title = `Nx Cloud Fix (${parsedDiff.length} file${parsedDiff.length === 1 ? '' : 's'})`;
      await commands.executeCommand('vscode.diff', beforeUri, afterUri, title, {
        preview: false,
        preserveFocus: false,
        viewColumn: ViewColumn.Beside,
      });
    }
  }

  static create(
    extensionContext: ExtensionContext,
    actor: ActorRef<any, EventObject>,
  ): NxCloudFixWebview {
    const nxCloudFixWebview = new NxCloudFixWebview(extensionContext);

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

    const subscription = actor.subscribe((state) => {
      const recentCIPEs = state.context.recentCIPEs;
      if (recentCIPEs) {
        nxCloudFixWebview.updateFixDetailsFromRecentCIPEs(recentCIPEs);
      }
    });

    // listen to git branch changes
    const repo = getGitApi().getRepository(Uri.file(getWorkspacePath()));
    if (repo) {
      extensionContext.subscriptions.push(
        repo.state.onDidChange(async () => {
          nxCloudFixWebview.updateWebviewContent();
        }),
      );
    }

    extensionContext.subscriptions.push({
      dispose: () => {
        subscription.unsubscribe();
      },
    });

    extensionContext.subscriptions.push(
      commands.registerCommand(
        'nxCloud.applyAiFix',
        async (
          data: { cipe: CIPEInfo; runGroup: CIPERunGroup },
          commitMessage?: string,
        ) => {
          getTelemetry().logUsage('cloud.apply-ai-fix');
          if (!data.runGroup.aiFix?.suggestedFix) {
            window.showErrorMessage('No AI fix available to apply');
            return;
          }

          const aiFixId = data.runGroup.aiFix.aiFixId;
          if (!aiFixId) {
            window.showErrorMessage('AI fix ID not found');
            return;
          }

          const success = await updateSuggestedFix(
            aiFixId,
            'APPLIED',
            commitMessage,
          );
          if (success) {
            getAiFixStatusBarService().hideAiFixStatusBarItem();
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.applyAiFixLocally',
        async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
          getTelemetry().logUsage('cloud.apply-ai-fix-locally');

          if (!data.runGroup.aiFix?.suggestedFix) {
            window.showErrorMessage('No AI fix available to apply locally');
            return;
          }

          const branch = await getGitBranch();
          if (branch && branch !== data.cipe.branch) {
            const result = await window.showWarningMessage(
              'Are you sure you want to apply the fix locally?',
              {
                modal: true,
                detail: `Your local branch ${branch} does not match the branch ${data.cipe.branch} of the CI pipeline execution.`,
              },
              'Apply',
            );
            if (result !== 'Apply') {
              return;
            }
          }

          try {
            if (data.runGroup.aiFix.shortLink) {
              await applyFixLocallyWithNxCloud(data.runGroup.aiFix.shortLink);
            } else {
              await applyFixLocallyWithGit(data.runGroup.aiFix.suggestedFix);
              await updateSuggestedFix(
                data.runGroup.aiFix.aiFixId,
                'APPLIED_LOCALLY',
              );
            }
            getAiFixStatusBarService().hideAiFixStatusBarItem();
          } catch (error) {
            vscodeLogger.log(
              `Failed to apply Nx Cloud fix locally: ${error.stderr || error.message}`,
            );
            window.showErrorMessage(
              'Failed to apply Nx Cloud fix locally. Please check the output for more details.',
            );
            return;
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.rejectAiFix',
        async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
          getTelemetry().logUsage('cloud.reject-ai-fix');

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
            getAiFixStatusBarService().hideAiFixStatusBarItem();
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.rerunCi',
        async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
          getTelemetry().logUsage('cloud.rerun-ci');

          if (!data.runGroup.aiFix) {
            window.showErrorMessage('No AI fix information available');
            return;
          }

          const aiFixId = data.runGroup.aiFix.aiFixId;
          if (!aiFixId) {
            window.showErrorMessage('AI fix ID not found');
            return;
          }

          const success = await updateSuggestedFix(aiFixId, 'RERUN_REQUESTED');
          if (success) {
            window.showInformationMessage('CI rerun requested');
            commands.executeCommand('nxCloud.refresh');
            getAiFixStatusBarService().hideAiFixStatusBarItem();
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.openFixDetails',
        async (args: { cipeId: string; runGroupId: string }) => {
          const recentCIPEs = actor.getSnapshot().context.recentCIPEs;

          // Find the parent CIPE
          const cipe = recentCIPEs?.find(
            (c: CIPEInfo) => c.ciPipelineExecutionId === args.cipeId,
          );

          const runGroup = cipe?.runGroups.find(
            (rg: CIPERunGroup) => rg.runGroup === args.runGroupId,
          );

          if (!cipe) {
            vscodeLogger.log(`CIPE ${args.cipeId} not found`);
            return;
          } else if (!runGroup) {
            vscodeLogger.log(
              `Run group ${args.runGroupId} not found in CIPE ${args.cipeId}`,
            );
            return;
          }

          if (!runGroup.aiFix) {
            vscodeLogger.log('No AI fix available on tree item');
            return;
          }

          console.log('Found CIPE, calling webview.showFixDetails');
          getTelemetry().logUsage('cloud.open-fix-details', {
            source: 'cloud-view',
          });

          let terminalOutput: string | undefined;
          const failedTaskId = runGroup.aiFix.taskIds[0];
          try {
            const terminalOutputUrl =
              runGroup.aiFix.terminalLogsUrls[failedTaskId];
            terminalOutput = await downloadAndExtractArtifact(
              terminalOutputUrl,
              vscodeLogger,
            );
          } catch (error) {
            vscodeLogger.log(
              `Failed to retrieve terminal output for task ${failedTaskId}: ${error}`,
            );
            terminalOutput =
              'Failed to retrieve terminal output. Please check the Nx Console output for more details.';
          }

          await nxCloudFixWebview.showFixDetails({
            cipe,
            runGroup: runGroup,
            terminalOutput,
          });
          getAiFixStatusBarService().hideAiFixStatusBarItem();
        },
      ),
    );
    return nxCloudFixWebview;
  }
}

async function updateSuggestedFix(
  aiFixId: string,
  action: UpdateSuggestedFixAction,
  commitMessage?: string,
): Promise<boolean> {
  const workspacePath = getWorkspacePath();
  const result = await updateSuggestedFixShared({
    workspacePath,
    logger: vscodeLogger,
    aiFixId,
    action,
    actionOrigin: 'NX_CONSOLE_VSCODE',
    commitMessage,
  });

  if (!result.success) {
    console.error('Failed to update suggested fix:', result.error);
    window.showErrorMessage(
      `Failed to ${action.toLowerCase()} AI fix: ${result.error?.message ?? 'Unknown error'}`,
    );
    return false;
  }

  return true;
}

export async function closeCloudFixDiffTab() {
  const diffTab = window.tabGroups.all
    .flatMap((g) => g.tabs)
    .find((t) => isCloudFixTab(t));

  if (diffTab) {
    await window.tabGroups.close(diffTab, true);
  }
}

function isCloudFixTab(tab: Tab): boolean {
  return (
    (tab as any)?.input?.textDiffs?.[0]?.original?.scheme ===
    'nx-cloud-fix-before'
  );
}

/**
 * Fetch and pull changes from remote after a fix has been applied
 * @param targetBranch The branch to fetch and pull from
 */
export async function fetchAndPullChanges(targetBranch: string): Promise<void> {
  try {
    const cwd = getNxWorkspacePath();

    // Always refresh remotes first
    execSync('git fetch origin', { cwd });

    // Get current branch name
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
    }).trim();

    if (currentBranch === targetBranch) {
      // On target branch: fast-forward your working tree
      execSync(`git pull --ff-only origin ${targetBranch}`, {
        cwd,
      });
    } else {
      // On another branch: fast-forward local target branch without checking it out
      // This creates the branch if missing, refuses if it wouldn't be a fast-forward
      execSync(`git fetch origin ${targetBranch}:${targetBranch}`, { cwd });
    }
  } catch (e) {
    logAndShowError(
      'Failed to fetch and pull changes. Please check the output and try again yourself.',
      `Failed to fetch and pull changes: ${e.stderr?.toString() || e.message}`,
    );
  }
}
