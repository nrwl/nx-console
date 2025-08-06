import {
  downloadAndExtractArtifact,
  nxCloudAuthHeaders,
} from '@nx-console/shared-nx-cloud';
import {
  CIPEInfo,
  CIPERunGroup,
  NxCloudFixDetails,
  NxCloudFixMessage,
} from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getNxCloudStatus } from '@nx-console/vscode-nx-workspace';
import { outputLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  getGitApi,
  getGitBranch,
  getGitHasUncommittedChanges,
  getGitRepository,
  getWorkspacePath,
  vscodeLogger,
} from '@nx-console/vscode-utils';
import { execSync } from 'child_process';
import { unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { xhr } from 'request-light';
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
import { hideAiFixStatusBarItem } from './cipe-notifications';
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
          globalThis.fixDetails = ${JSON.stringify(details)};
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
            window
              .showInformationMessage(
                'Nx Cloud fix applied successfully.',
                'Fetch & Pull Changes',
              )
              .then((result) => {
                if (result === 'Fetch & Pull Changes') {
                  try {
                    execSync('git fetch && git pull', {
                      cwd: getNxWorkspacePath(),
                    });
                  } catch (e) {
                    vscodeLogger.log(
                      `Failed to fetch and pull changes: ${e.stderr || e.message}`,
                    );
                    window.showErrorMessage(
                      'Failed to fetch and pull changes. Please check the output and try again yourself.',
                    );
                  }
                }
              });
            hideAiFixStatusBarItem();
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.applyAiFixLocally',
        async (data: { cipe: CIPEInfo; runGroup: CIPERunGroup }) => {
          if (!data.runGroup.aiFix?.suggestedFix) {
            window.showErrorMessage('No AI fix available to apply locally');
            return;
          }

          const repo = getGitRepository();
          if (!repo) {
            window.showErrorMessage('No Git repository found');
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
            const tempFilePath = join(
              tmpdir(),
              `nx-cloud-fix-${Date.now()}.patch`,
            );

            try {
              const suggestedFix = data.runGroup.aiFix.suggestedFix;
              if (suggestedFix.lastIndexOf('\n') !== suggestedFix.length - 1) {
                // Ensure the suggested fix ends with a newline
                data.runGroup.aiFix.suggestedFix += '\n';
              }

              await writeFile(tempFilePath, data.runGroup.aiFix.suggestedFix);
              await repo.apply(tempFilePath);
            } finally {
              await unlink(tempFilePath);
            }

            window.showInformationMessage(
              'Nx Cloud fix applied locally. Please review and modify any changes before committing.',
            );

            await updateSuggestedFix(
              data.runGroup.aiFix.aiFixId,
              'APPLIED_LOCALLY',
            );
            hideAiFixStatusBarItem();
          } catch (error) {
            outputLogger.log(
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
            hideAiFixStatusBarItem();
          }
        },
      ),
      commands.registerCommand(
        'nxCloud.openFixDetails',
        async (args: { cipeId: string; runGroupId: string }) => {
          const recentCIPEs = actor.getSnapshot().context.recentCIPEs;

          // Find the parent CIPE
          const cipe = recentCIPEs?.find(
            (c) => c.ciPipelineExecutionId === args.cipeId,
          );

          const runGroup = cipe?.runGroups.find(
            (rg) => rg.runGroup === args.runGroupId,
          );

          if (!cipe) {
            outputLogger.log(`CIPE ${args.cipeId} not found`);
            return;
          } else if (!runGroup) {
            outputLogger.log(
              `Run group ${args.runGroupId} not found in CIPE ${args.cipeId}`,
            );
            return;
          }

          if (!runGroup.aiFix) {
            outputLogger.log('No AI fix available on tree item');
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
            runGroup: runGroup,
            terminalOutput,
          });
          hideAiFixStatusBarItem();
        },
      ),
    );
    return nxCloudFixWebview;
  }
}

async function updateSuggestedFix(
  aiFixId: string,
  action: 'APPLIED' | 'REJECTED' | 'APPLIED_LOCALLY',
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
        actionOrigin: 'NX_CONSOLE_VSCODE',
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
