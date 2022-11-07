import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('claim-callout-element')
export class ClaimCallout extends LitElement {
  static styles = css`
    vscode-panel-view {
      background-color: var(--vscode-badge-background);
    }
    .message-container {
      display: flex;
      flex-direction: column;
    }
    .nx-cloud-icon {
      background-image: url('data:image/svg+xml;utf8,<svg role="img" xmlns="http://www.w3.org/2000/svg" stroke="white" fill="transparent" viewBox="0 0 24 24" class="h-10 w-10"><path stroke-width="2" d="M23 3.75V6.5c-3.036 0-5.5 2.464-5.5 5.5s-2.464 5.5-5.5 5.5-5.5 2.464-5.5 5.5H3.75C2.232 23 1 21.768 1 20.25V3.75C1 2.232 2.232 1 3.75 1h16.5C21.768 1 23 2.232 23 3.75Z" id="nx-cloud-header-logo-stroke-1"></path><path stroke-width="2" d="M23 6v14.1667C23 21.7307 21.7307 23 20.1667 23H6c0-3.128 2.53867-5.6667 5.6667-5.6667 3.128 0 5.6666-2.5386 5.6666-5.6666C17.3333 8.53867 19.872 6 23 6Z" id="nx-cloud-header-logo-stroke-2"></path></svg>');
    }
    .button {
      margin-left: auto;
      justify-self: end;
    }
  `;

  @property({ type: Boolean })
  isUsingCloudRunner: boolean;

  @property({ type: Boolean })
  hasLoaded: boolean;

  @property({ type: Boolean })
  isClaimed: boolean;

  @property({ type: Boolean })
  isAuthenticated: boolean;

  render() {
    if (!this.hasLoaded || this.isClaimed || !this.isUsingCloudRunner) {
      return;
    }
    return html`
      <callout-element
        icon="warning"
        message="Your workspace is connected to Nx cloud but it hasn't been claimed.
    Claiming the workspace allows you to control it and use all distributed
    features like DTE, VCS integration and advanced analysis."
        .actionText="${this.isAuthenticated
          ? 'Claim your workspace'
          : 'Log in and Claim your workspace'}"
        @actionclicked="${() => this._claimButtonClicked(this.isAuthenticated)}"
      >
      </callout-element>
    `;
  }

  private _claimButtonClicked(isAuthenticated: boolean) {
    let event: Event;
    if (isAuthenticated) {
      event = new Event('claim-event', {
        bubbles: true,
        composed: true,
      });
    } else {
      event = new Event('login-and-claim-event', {
        bubbles: true,
        composed: true,
      });
    }
    this.dispatchEvent(event);
  }
}
