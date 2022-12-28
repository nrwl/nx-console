import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { VCSIntegrationStatusOptions } from '../../lib/nx-cloud-service/models';
import type { WebviewState } from '../../lib/nx-cloud-service/nx-cloud-service';

@customElement('status-labels-element')
export class StatusLabels extends LitElement {
  static styles = css`
    :host {
      padding: 0.3rem;
    }
  `;
  @property()
  state: WebviewState | undefined = undefined;

  render() {
    const dteStatus = this.state?.hasUsedDTE
      ? 2
      : this.state?.isUsingCloudRunner
      ? 1
      : 0;
    const dteLabel =
      dteStatus === 2
        ? 'DTE enabled'
        : dteStatus === 1
        ? 'No distributed tasks executed yet'
        : '';
    return html`
      <status-label
        .status=${this.state?.isUsingCloudRunner ? 2 : 0}
        text="REMOTE CACHE"
        @helpclicked=${() => this._helpClicked('remote-cache')}
        @connectclicked=${() => this._setupCloudRunner()}
      ></status-label>
      <status-label
        .status=${dteStatus}
        text="DISTRIBUTED TASK EXECUTION (DTE)"
        .title="${dteLabel}"
        @helpclicked="${() => this._helpClicked('dte')}"
        @connectclicked=${() => this._setupCloudRunner()}
      >
      </status-label>
      <status-label
        .status=${this._convertVcsIntegrationToNum(
          this.state?.vcsIntegrationStatus
        )}
        text="VCS INTEGRATION"
        @helpclicked=${() => this._helpClicked('vcs')}
        @connectclicked=${() => this._setupVcs()}
      >
      </status-label>
    `;
  }
  private _convertVcsIntegrationToNum(
    vcsIntegrationStatus: VCSIntegrationStatusOptions | undefined
  ): 2 | 1 | 0 {
    return vcsIntegrationStatus === 'new'
      ? 2
      : vcsIntegrationStatus === 'legacy'
      ? 1
      : 0;
  }

  private _helpClicked(id: string) {
    const event = new CustomEvent<{ id: string }>('help-clicked-event', {
      detail: {
        id,
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _setupCloudRunner() {
    this.dispatchEvent(
      new Event('setup-cloud-runner-event', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _setupVcs() {
    this.dispatchEvent(
      new Event('setup-vcs-event', {
        bubbles: true,
        composed: true,
      })
    );
  }
}

@customElement('status-label')
class StatusLabel extends LitElement {
  static styles = css`
    .flexcontainer {
      display: grid;
      grid-template-columns: 1rem minmax(0, 2fr);
      gap: 1rem;
      align-items: center;
    }
    .flexcontainer .tag {
      grid-column: 1;
    }
    .flexcontainer .text {
      grid-column: 2 / -1;
      font-weight: bold;
    }
    .flexcontainer .actions {
      grid-column: -1;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem;
    }
    .dot {
      border-radius: 9999px;
      display: inline-flex;
      height: 0.6rem;
      transition: background-color cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
      width: 0.6rem;
    }
    .status-2 {
      background: #307838;
    }
    .status-1 {
      background: var(--vscode-editorWarning-foreground);
    }
    .status-0 {
      background: grey;
    }
  `;
  // git green var(--vscode-gitDecoration-untrackedResourceForeground)

  @property({ type: Number })
  status: 2 | 1 | 0 = 0;

  @property({ type: String })
  text: string;

  render() {
    return html`
      <div class="flexcontainer" style="margin: 10px 0px 10px 0px">
        <!-- Status Dot-->
        <span class="dot status-${this.status}"> </span>
        <!-- Label-->
        <span class="text"> ${this.text} </span>
        <div class="actions">
          <!-- Optional Disconnected Button -->
          ${this.status !== 0
            ? undefined
            : html` <vscode-button
                appearance="icon"
                @click=${this._connectClicked}
                ><codicon-element icon="debug-disconnect"></codicon-element
              ></vscode-button>`}
          <!-- Help Button-->
          <vscode-button
            appearance="icon"
            @click=${this._helpClicked}
            style="grid-column: 2"
            ><codicon-element icon="question"></codicon-element
          ></vscode-button>
        </div>
      </div>
    `;
  }

  private _helpClicked() {
    const event = new Event('helpclicked');
    this.dispatchEvent(event);
  }

  private _connectClicked() {
    const event = new Event('connectclicked');
    this.dispatchEvent(event);
  }
}
