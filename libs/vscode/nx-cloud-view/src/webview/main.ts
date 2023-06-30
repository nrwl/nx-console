import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  CLAIM_COMMAND,
  INSPECT_RUN_COMMAND,
  LOGIN_AND_CLAIM_COMMAND,
  LOGIN_COMMAND,
  OPEN_WEBAPP_COMMAND,
  REFRESH_COMMAND,
  RUN_FIRST_COMMAND_COMMAND,
  SETUP_CLOUD_RUNNER_COMMAND,
  SETUP_VCS_COMMAND,
  SHOW_HELP_COMMAND,
} from '../lib/nx-cloud-service/commands';
import type { WebviewState } from '../lib/nx-cloud-service/nx-cloud-service';
import type { WebviewApi } from 'vscode-webview';
import { when } from 'lit/directives/when.js';

import './all-components';

@customElement('root-element')
export class Root extends LitElement {
  static styles = css`
    .container {
      min-height: 100%;
      position: relative;
      display: inline-flex;
      flex-direction: column;
    }
    .content {
      padding-bottom: 1.5rem;
    }
    vscode-divider {
      margin: 1.5rem 0 1rem 0;
    }
    steps-element {
      height: 100%;
    }
    logo-element {
      position: absolute;
      width: 100%;
      bottom: 0;
      right: 0;
    }
  `;
  @state()
  private state: WebviewState | undefined = undefined;

  private vscodeApi: WebviewApi<WebviewState>;

  render() {
    return html`
      <div class="container">
        ${when(
          this.state?.isUsingCloudRunner,
          () =>
            html`
              <status-labels-element
                .state=${this.state}
              ></status-labels-element>
              <vscode-divider role="seperator"></vscode-divider>
            `
        )}
        <div class="content">
          <claim-callout-element
            ?isusingcloudrunner=${this.state?.isUsingCloudRunner}
            ?hasloaded=${this.state?.hasLoadedWorkspaceDetails}
            ?isclaimed=${this.state?.isCloudWorkspaceClaimed}
            ?isauthenticated=${this.state?.isAuthenticated}
          ></claim-callout-element>
          <steps-element .state=${this.state}></steps-element>
        </div>
        <logo-element></logo-element>
      </div>
    `;
  }

  private setState(state: WebviewState) {
    this.state = { ...state };
    this.vscodeApi.setState(state);
    console.log(this.state);
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    this.vscodeApi = acquireVsCodeApi();
    const savedState = this.vscodeApi.getState();
    if (savedState) {
      this.setState(savedState);
    }

    // listen for events from the vscode host
    window.addEventListener(
      'message',
      (e) => {
        const data = e.data;
        this.setState(data);
      },
      false
    );

    // listen for events from within the webview
    window.addEventListener('setup-cloud-runner-event', (e) => {
      this.vscodeApi.postMessage({ command: SETUP_CLOUD_RUNNER_COMMAND });
    });
    window.addEventListener('run-first-command-event', (e) => {
      this.vscodeApi.postMessage({ command: RUN_FIRST_COMMAND_COMMAND });
    });
    window.addEventListener('login-event', (e) => {
      this.vscodeApi.postMessage({ command: LOGIN_COMMAND });
    });
    window.addEventListener('login-and-claim-event', (e) => {
      this.vscodeApi.postMessage({ command: LOGIN_AND_CLAIM_COMMAND });
    });
    window.addEventListener('claim-event', (e) => {
      this.vscodeApi.postMessage({ command: CLAIM_COMMAND });
    });
    this.addEventListener('help-clicked-event', (e: CustomEventInit) => {
      this.vscodeApi.postMessage({
        command: SHOW_HELP_COMMAND,
        id: e.detail.id,
      });
    });
    this.addEventListener('run-first-command-event', (e: CustomEventInit) => {
      this.vscodeApi.postMessage({
        command: RUN_FIRST_COMMAND_COMMAND,
        commandString: e.detail.command,
      });
    });
    this.addEventListener('refresh-event', () => {
      this.vscodeApi.postMessage({ command: REFRESH_COMMAND });
    });
    this.addEventListener('inspect-run-event', (e: CustomEventInit) => {
      this.vscodeApi.postMessage({
        command: INSPECT_RUN_COMMAND,
        runLinkId: e.detail.runLinkId,
      });
    });
    this.addEventListener('setup-vcs-event', () => {
      this.vscodeApi.postMessage({ command: SETUP_VCS_COMMAND });
    });
    this.addEventListener('open-webapp-event', () => {
      this.vscodeApi.postMessage({ command: OPEN_WEBAPP_COMMAND });
    });
  }
}
