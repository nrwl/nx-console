import { ContextProvider } from '@lit-labs/context';
import { ReactiveController, ReactiveElement } from 'lit';
import type { WebviewApi } from 'vscode-webview';
import { editorContext } from '@nx-console/shared-ui-components';
import type {
  NxCloudFixInputMessage,
  NxCloudFixOutputMessage,
  NxCloudFixStyles,
} from './types';
import { NxCloudFixDetails } from '@nx-console/shared-types';

export class IdeCommunicationController implements ReactiveController {
  editor: 'vscode' | 'intellij';
  details: NxCloudFixDetails | undefined;

  private postToIde: (message: unknown) => void;

  constructor(private host: ReactiveElement) {
    let vscode: WebviewApi<undefined> | undefined;
    try {
      vscode = acquireVsCodeApi();
    } catch (e) {
      // noop - we're in IntelliJ
    }

    this.editor = vscode ? 'vscode' : 'intellij';
    console.log('initializing ide communication for', this.editor);

    new ContextProvider(host, {
      context: editorContext,
      initialValue: this.editor,
    });

    if (vscode) {
      this.setupVscodeCommunication(vscode);
    } else {
      this.setupIntellijCommunication();
    }

    // Set initial details from global if available
    if (globalThis.fixDetails) {
      this.details = globalThis.fixDetails as NxCloudFixDetails;
    }
  }

  hostConnected(): void {
    // noop
  }

  postMessageToIde(message: NxCloudFixOutputMessage) {
    this.postToIde(message);
  }

  private setupVscodeCommunication(vscode: WebviewApi<undefined>) {
    window.addEventListener(
      'message',
      (event: MessageEvent<NxCloudFixInputMessage>) => {
        const data = event.data;
        if (!data) {
          return;
        }
        this.handleInputMessage(data);
      },
    );

    this.postToIde = (message) => vscode.postMessage(message);
  }

  private setupIntellijCommunication() {
    window.intellijApi?.registerPostToWebviewCallback(
      (message: NxCloudFixInputMessage) => {
        this.handleInputMessage(message);
      },
    );

    this.postToIde = (message) => {
      const stringified = JSON.stringify(message);
      window.intellijApi?.postToIde(stringified);
    };
  }

  private handleInputMessage(message: NxCloudFixInputMessage) {
    switch (message.type) {
      case 'update-details': {
        this.details = {
          ...this.details,
          ...(message.details ?? {}),
        };
        this.host.requestUpdate();
        break;
      }

      case 'styles': {
        this.setIntellijStyles(message.payload);
        this.host.requestUpdate();
        break;
      }
    }
  }

  private setIntellijStyles(styles: NxCloudFixStyles) {
    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(`
    :root {
      --foreground-color: ${styles.foregroundColor};
      --muted-foreground-color: ${styles.mutedForegroundColor};
      --background-color: ${styles.backgroundColor};
      --primary-color: ${styles.primaryColor};
      --error-color: ${styles.errorColor};
      --field-background-color: ${styles.fieldBackgroundColor};
      --field-border-color: ${styles.fieldBorderColor};
      --select-field-background-color: ${styles.selectFieldBackgroundColor};
      --active-selection-background-color: ${styles.activeSelectionBackgroundColor};
      --focus-border-color: ${styles.focusBorderColor};
      --banner-warning-color: ${styles.bannerWarningBackgroundColor};
      --banner-text-color: ${styles.bannerTextColor};
      --badge-background-color: ${styles.badgeBackgroundColor};
      --badge-foreground-color: ${styles.badgeForegroundColor};
      --separator-color: ${styles.separatorColor};
      --field-nav-hover-color: ${styles.fieldNavHoverColor};
      --scrollbar-thumb-color: ${styles.scrollbarThumbColor};
      --success-color: ${styles.successColor};
      --warning-color: ${styles.warningColor};
      --hover-color: ${styles.hoverColor};
      --border-color: ${styles.borderColor};
      --secondary-color: ${styles.secondaryColor};
      --secondary-foreground-color: ${styles.secondaryForegroundColor};
      font-family: ${styles.fontFamily};
      font-size: ${styles.fontSize};
    }
    `);
    document.adoptedStyleSheets = [styleSheet];
  }
}
