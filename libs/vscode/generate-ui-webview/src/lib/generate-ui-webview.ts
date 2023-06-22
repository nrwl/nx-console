import {
  GenerateUiBannerInputMessage,
  GenerateUiConfigurationInputMessage,
  GenerateUiGeneratorSchemaInputMessage,
  GenerateUiInputMessage,
  GenerateUiOutputMessage,
  GenerateUiValidationResultsInputMessage,
  GeneratorSchema,
  ValidationResults,
} from '@nx-console/shared/generate-ui-types';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { existsSync } from 'node:fs';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  commands,
  window,
} from 'vscode';

export class GenerateUiWebview {
  private webviewPanel: WebviewPanel | undefined;

  private _webviewSourceUri: Uri;

  private generatorToDisplay: GeneratorSchema | undefined;

  private plugins:
    | { schemaProcessors?: any[]; validators?: any[]; startupMessages?: any[] }
    | undefined;

  constructor(private context: ExtensionContext) {
    this._webviewSourceUri = Uri.joinPath(
      this.context.extensionUri,
      'generate-ui-v2'
    );
  }

  async openGenerateUi(generator: GeneratorSchema) {
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
          <script type="module" src="${scriptUri}"></script>

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

      this.plugins = await this.loadPlugins();
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

  private async handleMessageFromWebview(message: GenerateUiOutputMessage) {
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

        const nxWorkspace = await getNxWorkspace();
        this.plugins?.startupMessages?.forEach((messageFunction) => {
          const message = messageFunction(nxWorkspace);
          if (message) {
            this.postMessageToWebview(
              new GenerateUiBannerInputMessage(message)
            );
          }
        });
        break;
      }
      case 'request-validation': {
        const validators = this.plugins?.validators;
        let validationErrors: ValidationResults = {};
        if (validators) {
          validators.forEach((validator) => {
            const result = validator(
              message.payload.formValues,
              message.payload.schema
            );
            if (result) {
              validationErrors = { ...validationErrors, ...result };
            }
          });
        }
        this.postMessageToWebview(
          new GenerateUiValidationResultsInputMessage(validationErrors)
        );
        break;
      }
    }
  }

  private async loadPlugins(): Promise<
    | { schemaProcessors?: any[]; validators?: any[]; startupMessages?: any[] }
    | undefined
  > {
    const workspace = await getNxWorkspace();
    try {
      const pluginFile = `${workspace.workspacePath}/.nx/console/plugins.mjs`;
      if (!existsSync(pluginFile)) {
        return undefined;
      }
      return await import(pluginFile).then((module) => module.default);
    } catch (_) {
      return undefined;
    }
  }

  private async transformMessage(
    message: GenerateUiGeneratorSchemaInputMessage
  ): Promise<GenerateUiGeneratorSchemaInputMessage> {
    const workspace = await getNxWorkspace();
    let modifiedSchema = message.payload;
    try {
      this.plugins?.schemaProcessors?.forEach((processor) => {
        modifiedSchema = processor(modifiedSchema, workspace);
      });
      return {
        ...message,
        payload: modifiedSchema,
      };
    } catch (e) {
      return message;
    }
  }

  private getVscodeStyleMappings(): string {
    // note that --vscode-settings-dropdownListBorder is the color used for the webview ui toolkit divider
    // refer to https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/src/design-tokens.ts
    return `
      --foreground-color: var(--vscode-editor-foreground);
      --background-color: var(--vscode-editor-background);
      --primary-color: var(--button-primary-background);
      --error-color: var(--vscode-inputValidation-errorBorder);
      --field-border-color: var(--panel-view-border);
      --focus-border-color: var(--vscode-focusBorder);
      --badge-background-color: var(--vscode-badge-background);
      --badge-foreground-color: var(--vscode-badge-foreground);
      --banner-warning-color: var(--vscode-statusBarItem-warningBackground);
      --banner-error-color: var(--vscode-statusBarItem-errorBackground);
      --banner-text-color: var(--vscode-statusBarItem-warningForeground);
      --separator-color: var(--vscode-settings-dropdownListBorder);
      --field-nav-hover-color: var(--vscode-list-hoverBackground);
    `;
  }
}
