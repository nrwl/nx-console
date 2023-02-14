import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('codicon-element')
export class Codicon extends LitElement {
  static styles = css`
    @media screen and (max-width: 250px) {
      .codicon {
        font-size: calc(var(--vscode-font-size) * 0.9) !important;
      }
    }
  `;
  @property()
  icon: string;

  @property()
  color: string;

  @state()
  codiconsUri: string;

  render() {
    return html`
      <link href="${this.codiconsUri}" rel="stylesheet" />
      <i
        class="codicon codicon-${this.icon}"
        style="color: ${this.color}; text-align: center;"
      ></i>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.codiconsUri = (window as any).codiconsUri;
  }
}
