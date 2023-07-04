import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('no-cache-element')
export class NoCache extends LitElement {
  static styles = css`
    .nx-cloud-icon {
      background-image: url('data:image/svg+xml;utf8,<svg role="img" xmlns="http://www.w3.org/2000/svg" stroke="white" fill="transparent" viewBox="0 0 24 24" class="h-10 w-10"><path stroke-width="2" d="M23 3.75V6.5c-3.036 0-5.5 2.464-5.5 5.5s-2.464 5.5-5.5 5.5-5.5 2.464-5.5 5.5H3.75C2.232 23 1 21.768 1 20.25V3.75C1 2.232 2.232 1 3.75 1h16.5C21.768 1 23 2.232 23 3.75Z" id="nx-cloud-header-logo-stroke-1"></path><path stroke-width="2" d="M23 6v14.1667C23 21.7307 21.7307 23 20.1667 23H6c0-3.128 2.53867-5.6667 5.6667-5.6667 3.128 0 5.6666-2.5386 5.6666-5.6666C17.3333 8.53867 19.872 6 23 6Z" id="nx-cloud-header-logo-stroke-2"></path></svg>');
    }
    .setup-button {
      width: 100%;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    a {
      color: var(--vscode-textLink-foreground);
    }
  `;

  render() {
    return html`
      <p>
        Your workspace is not currently set up to use distributed caching and
        task execution.
      </p>
      <vscode-button @click="${this._setupButtonClicked}" class="setup-button">
        Set up Nx Cloud
        <span slot="start" class="nx-cloud-icon"></span>
      </vscode-button>
      <p>
        Your workspace only uses local caching which is not affecting your CI
        runs or coworkers. Use the Nx Cloud runner to enable
        <a href="https://nx.dev/core-features/share-your-cache">
          distributed caching
        </a>
        and
        <a href="https://nx.dev/core-features/distribute-task-execution">
          task execution </a
        >.
      </p>
    `;
  }

  private _setupButtonClicked() {
    const event = new Event('setup-cloud-runner-event', {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}
