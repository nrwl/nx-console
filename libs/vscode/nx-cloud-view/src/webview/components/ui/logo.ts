import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('logo-element')
export class Logo extends LitElement {
  static styles = css`
    :host {
      color: var(--vscode-input-placeholderForeground);
      font-size: 0.75rem;
      padding: 0.5rem;
    }
    .nx-cloud-icon {
      height: 1rem;
      width: 1rem;
      margin-right: 0.5rem;
      background-image: url('data:image/svg+xml;utf8,');
    }
    .nx-cloud-icon svg {
      stroke: var(--vscode-input-placeholderForeground);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: end;
    }
  `;
  render() {
    return html` <div class="logo">
      <div style="padding-right: 0.75rem; font-size: 0.5rem;">Powered by</div>
      <span class="nx-cloud-icon">
        <svg
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          fill="transparent"
          viewBox="0 0 24 24"
          class="h-10 w-10"
        >
          <path
            stroke-width="2"
            d="M23 3.75V6.5c-3.036 0-5.5 2.464-5.5 5.5s-2.464 5.5-5.5 5.5-5.5 2.464-5.5 5.5H3.75C2.232 23 1 21.768 1 20.25V3.75C1 2.232 2.232 1 3.75 1h16.5C21.768 1 23 2.232 23 3.75Z"
            id="nx-cloud-header-logo-stroke-1"
          ></path>
          <path
            stroke-width="2"
            d="M23 6v14.1667C23 21.7307 21.7307 23 20.1667 23H6c0-3.128 2.53867-5.6667 5.6667-5.6667 3.128 0 5.6666-2.5386 5.6666-5.6666C17.3333 8.53867 19.872 6 23 6Z"
            id="nx-cloud-header-logo-stroke-2"
          ></path>
        </svg>
      </span>
      <div>Nx Cloud</div>
    </div>`;
  }
}
