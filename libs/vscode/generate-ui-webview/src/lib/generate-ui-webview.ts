import {
  GenerateUiConfigurationInputMessage,
  GenerateUiGeneratorSchemaInputMessage,
  GenerateUiInputMessage,
  GenerateUiOutputMessage,
  GeneratorSchema,
} from '@nx-console/shared/generate-ui-types';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import {
  getNxWorkspace,
  getNxWorkspacePath,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';

export class GenerateUiWebview {
  private webviewPanel: WebviewPanel | undefined;

  private _webviewSourceUri: Uri;

  private generatorToDisplay: GeneratorSchema | undefined;

  constructor(private context: ExtensionContext) {
    this._webviewSourceUri = Uri.joinPath(
      this.context.extensionUri,
      'generate-ui-v2'
    );
  }

  openGenerateUi(generator: GeneratorSchema) {
    this.generatorToDisplay = generator;
    if (!this.webviewPanel) {
      this.webviewPanel = window.createWebviewPanel(
        'nx-console', // Identifies the type of the webview. Used internally
        'Generate UI', // Title of the panel displayed to the user
        ViewColumn.Active, // Editor column to show the new webview panel in.
        {
          retainContextWhenHidden: true,
          enableScripts: true,
          localResourceRoots: [this._webviewSourceUri],
        }
      );

      const scriptUri = this.webviewPanel.webview.asWebviewUri(
        Uri.joinPath(this._webviewSourceUri, 'main.js')
      );
      const stylesUri = this.webviewPanel.webview.asWebviewUri(
        Uri.joinPath(this._webviewSourceUri, 'output.css')
      );

      const uiToolkitUri = this.webviewPanel.webview.asWebviewUri(
        Uri.joinPath(
          this._webviewSourceUri,
          '@vscode',
          'webview-ui-toolkit',
          'dist',
          'toolkit.js'
        )
      );

      const codiconsUri = this.webviewPanel.webview.asWebviewUri(
        Uri.joinPath(
          this._webviewSourceUri,
          '@vscode',
          'codicons',
          'dist',
          'codicon.css'
        )
      );

      this.webviewPanel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Generate UI</title>
            <link href="${stylesUri}" rel="stylesheet">
            <link href="${codiconsUri}" rel="stylesheet">
            <style>
            :root {
              ${this.getVscodeStyleMappings()}
            }
            body {
              padding: 0;
            }
            </style>
            </head>
        <body>
        <script type="module" src="${uiToolkitUri}">“</script>
        <script type="module" src="${scriptUri}"></script>
        
        <script type="text/javascript">
         window.codiconsUri = "${codiconsUri}";
        </script>

        <root-element></root-element>
        </body>
        </html>
    `;

      this.webviewPanel.webview.onDidReceiveMessage(
        (message: GenerateUiOutputMessage) => {
          this.handleMessageFromWebview(message);
        }
      );

      this.webviewPanel.onDidDispose(() => {
        this.webviewPanel = undefined;
        this.generatorToDisplay = undefined;
      });
    }
    this.webviewPanel.reveal();
  }

  private async postMessageToWebview(message: GenerateUiInputMessage) {
    if (message.payloadType === 'generator') {
      const transformed = await this.transformMessage(message);
      this.webviewPanel?.webview.postMessage(transformed);
    } else {
      this.webviewPanel?.webview.postMessage(message);
    }
  }

  private handleMessageFromWebview(message: GenerateUiOutputMessage) {
    switch (message.payloadType) {
      case 'run-generator': {
        CliTaskProvider.instance.executeTask({
          command: 'generate',
          ...message.payload,
        });
        break;
      }
      case 'output-init': {
        if (!this.generatorToDisplay) {
          return;
        }
        commands.executeCommand('workbench.action.focusActiveEditorGroup');
        this.postMessageToWebview(
          new GenerateUiConfigurationInputMessage({
            enableTaskExecutionDryRunOnChange:
              !!GlobalConfigurationStore.instance.get(
                'enableTaskExecutionDryRunOnChange'
              ),
          })
        );
        this.postMessageToWebview(
          new GenerateUiGeneratorSchemaInputMessage(this.generatorToDisplay)
        );
        break;
      }
    }
  }

  private async transformMessage(
    message: GenerateUiGeneratorSchemaInputMessage
  ): Promise<GenerateUiGeneratorSchemaInputMessage> {
    const workspace = await getNxWorkspace();
    let modifiedSchema = message.payload;
    try {
      const localModDir = `${workspace.workspacePath}/.nx/console`;
      if (!existsSync(localModDir)) {
        return message;
      }
      const localMods = readdirSync(localModDir);
      for (const mod of localMods) {
        await import(`${localModDir}/${mod}`).then(
          (module) =>
            (modifiedSchema = module.default(modifiedSchema, workspace))
        );
      }
      return {
        ...message,
        payload: modifiedSchema,
      };
    } catch (e) {
      return message;
    }
  }

  private getVscodeStyleMappings(): string {
    return `
      --foreground-color: var(--vscode-editor-foreground);
      --background-color: var(--vscode-editor-background);
      --field-border-color: var(--panel-view-border);
    `;
  }
}
