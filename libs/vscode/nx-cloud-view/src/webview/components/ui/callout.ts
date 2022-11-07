import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('callout-element')
export class Callout extends LitElement {
  static styles = css`
    .panel {
      padding: 0.5rem 0.5rem;
      margin: 1rem 0;
      border-radius: 0.25rem;
      background-color: var(--vscode-input-background);
    }
    .panel .top-region {
      display: flex;
      flex-direction: row;
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
  @property({ type: String })
  icon: string;

  @property({ type: String })
  message: string;

  @property({ type: String })
  actionText: string;

  @property({ type: Boolean })
  noActionIcon: boolean;

  render() {
    return html`
      <div class="panel">
        <div class="top-region">
          <codicon-element
            style="padding-right: 0.75rem"
            .icon="${this.icon}"
          ></codicon-element>
          <div class="message-container">
            <p style="margin-top: 0">${this.message}</p>
            ${this._getActionHtml()}
          </div>
        </div>
        <div style="display: block">
          <slot></slot>
        </div>
      </div>
    `;
  }

  private _getActionHtml() {
    if (!this.actionText) {
      return html``;
    }
    return html`
      <vscode-button @click="${() => this._buttonClicked()}" class="button">
        ${this.actionText}
        ${this.noActionIcon
          ? undefined
          : html`<span slot="start" class="nx-cloud-icon"></span>`}
      </vscode-button>
    `;
  }

  private _buttonClicked() {
    this.dispatchEvent(new Event('actionclicked'));
  }
}
