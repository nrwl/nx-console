import {
  FormValues,
  GenerateUiBannerInputMessage,
  GenerateUiConfigurationInputMessage,
  GenerateUiGeneratorSchemaInputMessage,
  GenerateUiInputMessage,
  GenerateUiOutputMessage,
  GenerateUiValidationResultsInputMessage,
  GeneratorSchema,
  ValidationResults,
} from '@nx-console/shared-generate-ui-types';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode-configuration';
import {
  getStartupMessage,
  getTransformedGeneratorSchema,
} from '@nx-console/vscode-nx-workspace';
import { CliTaskProvider, NodeTask } from '@nx-console/vscode-tasks';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  commands,
  ExtensionContext,
  extensions,
  tasks,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  EventEmitter,
} from 'vscode';
import { fillWithGenerateUi } from './fill-with-generate-ui';

export class GenerateUiWebview {
  private webviewPanel: WebviewPanel | undefined;

  private _webviewSourceUri: Uri;

  private generatorToDisplay: GeneratorSchema | undefined;

  private plugins:
    | { schemaProcessors?: any[]; validators?: any[]; startupMessages?: any[] }
    | undefined;

  private openedFromAI = false;

  private readonly _onDispose = new EventEmitter<void>();

  constructor(private context: ExtensionContext) {
    this._webviewSourceUri = Uri.joinPath(
      this.context.extensionUri,
      'generate-ui-v2',
    );
  }

  get onDispose() {
    return this._onDispose.event;
  }

  async openGenerateUi(generator: GeneratorSchema, openedFromAI = false) {
    if (this.webviewPanel !== undefined) {
      this.webviewPanel.dispose();
    }

    this.openedFromAI = openedFromAI;

    this.generatorToDisplay = generator;
    this.webviewPanel = window.createWebviewPanel(
      'nx-console', // Identifies the type of the webview. Used internally
      'Generate UI', // Title of the panel displayed to the user
      ViewColumn.Active, // Editor column to show the new webview panel in.
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    const scriptUri = this.webviewPanel.webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'main.js'),
    );
    const stylesUri = this.webviewPanel.webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'output.css'),
    );

    const codiconsUri = this.webviewPanel.webview.asWebviewUri(
      Uri.joinPath(
        this._webviewSourceUri,
        '@vscode',
        'codicons',
        'dist',
        'codicon.css',
      ),
    );

    const vscodeElementsUri = this.webviewPanel.webview.asWebviewUri(
      Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        '@vscode-elements',
        'elements',
        'dist',
        'bundled.js',
      ),
    );

    this.webviewPanel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Generate UI</title>
            <link href="${stylesUri}" rel="stylesheet">
            <link 
            href="${codiconsUri}" 
            rel="stylesheet"
            id="vscode-codicon-stylesheet"
            >
            <style>
            :root {
              ${this.getVscodeStyleMappings()}
              font-size: var(--vscode-font-size);
            }
            body {
              padding: 0;
            }
            </style>
            <script type="module" src="${vscodeElementsUri}"></script>
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
      },
    );

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
      this.generatorToDisplay = undefined;
      this._onDispose.fire();
    });

    this.plugins = await this.loadPlugins();

    this.webviewPanel.reveal();
  }

  async updateFormValues(formValues: FormValues) {
    this.postMessageToWebview({
      payloadType: 'update-form-values',
      payload: formValues,
    });
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
        if (message.payload.flags.includes('--dry-run') || !this.openedFromAI) {
          CliTaskProvider.instance.executeTask({
            command: 'generate',
            ...message.payload,
          });
        } else {
          const scriptLocation = join(
            this.context.extensionUri.fsPath,
            'wrap-generator.js',
          );
          const task = await NodeTask.create({
            script: scriptLocation,
            args: [
              'npx',
              'nx',
              'generate',
              message.payload.positional,
              ...message.payload.flags,
            ],
          });
          await tasks.executeTask(task);
        }
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
                'enableTaskExecutionDryRunOnChange',
              ),
            hasCopilot: !!extensions.getExtension('github.copilot-chat'),
          }),
        );
        this.postMessageToWebview(
          new GenerateUiGeneratorSchemaInputMessage(this.generatorToDisplay),
        );

        getStartupMessage(this.generatorToDisplay).then((startupMessage) => {
          if (startupMessage) {
            this.postMessageToWebview(
              new GenerateUiBannerInputMessage(startupMessage),
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
              message.payload.schema,
            );
            if (result) {
              validationErrors = { ...validationErrors, ...result };
            }
          });
        }
        this.postMessageToWebview(
          new GenerateUiValidationResultsInputMessage(validationErrors),
        );
        break;
      }
      case 'fill-with-copilot': {
        await fillWithGenerateUi(
          message.payload.generatorName,
          message.payload.formValues,
        );
        break;
      }
    }
  }

  private async loadPlugins(): Promise<
    | { schemaProcessors?: any[]; validators?: any[]; startupMessages?: any[] }
    | undefined
  > {
    try {
      const pluginFile = `${getNxWorkspacePath()}/.nx/console/plugins.mjs`;
      if (!existsSync(pluginFile)) {
        return undefined;
      }
      return await import(pluginFile).then((module) => module.default);
    } catch (_) {
      return undefined;
    }
  }

  private async transformMessage(
    message: GenerateUiGeneratorSchemaInputMessage,
  ): Promise<GenerateUiGeneratorSchemaInputMessage> {
    const transformedSchema = await getTransformedGeneratorSchema(
      message.payload,
    );
    return {
      ...message,
      payload: transformedSchema ?? message.payload,
    };
  }

  private getVscodeStyleMappings(): string {
    // note that --vscode-settings-dropdownListBorder is the color used for the webview ui toolkit divider
    // refer to https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/src/design-tokens.ts
    return `
      --foreground-color: var(--vscode-editor-foreground);
      --muted-foreground-color: var(--vscode-input-placeholderForeground);
      --background-color: var(--vscode-editor-background);
      --primary-color: var(--button-primary-background, var(--vscode-button-background));
      --secondary-color: var(--button-secondary-background);
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
