import { CIPEInfo, CIPERunGroup } from '@nx-console/shared-types';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import {
  commands,
  EventEmitter,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
} from 'vscode';
import { createUnifiedDiffView } from './nx-cloud-fix-tree-item';
import { join } from 'path';
import { DiffContentProvider, parseGitDiff } from './diffs/diff-provider';

export interface NxCloudFixWebviewMessage {
  type: 'apply' | 'reject' | 'webview-ready' | 'show-diff';
}

export interface NxCloudFixDetails {
  cipe: CIPEInfo;
  runGroup: CIPERunGroup;
  terminalOutput?: string;
}

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
      async (message: NxCloudFixWebviewMessage) => {
        await this.handleWebviewMessage(message);
      },
    );

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
      this.currentFixDetails = undefined;
      this._onDispose.fire();
    });
  }

  private async handleWebviewMessage(message: NxCloudFixWebviewMessage) {
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
      case 'webview-ready':
        this.updateWebviewContent();
        break;
      case 'show-diff':
        if (this.currentFixDetails.runGroup.aiFix?.suggestedFix) {
          await this.showDiffInSplitPanel(
            this.currentFixDetails.runGroup.aiFix.suggestedFix,
          );
        }
        break;
    }
  }

  private updateWebviewContent() {
    if (!this.webviewPanel || !this.currentFixDetails) return;
    const html = this.getWebviewHtml(this.currentFixDetails);
    this.webviewPanel.webview.html = html;
  }

  private getWebviewHtml(details: NxCloudFixDetails): string {
    const webviewScriptUri = this.webviewPanel?.webview.asWebviewUri(
      Uri.joinPath(
        this.context.extensionUri,
        'nx-cloud-fix-webview',
        'main.js',
      ),
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
        <root-nx-cloud-fix-element .details=${JSON.stringify(details)}></root-nx-cloud-fix-element>
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
}
