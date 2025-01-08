import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';
import { intellijFocusRing } from '../utils/ui-utils';

@customElement('button-element')
export class Button extends EditorContext(LitElement) {
  @property()
  text: string;

  @property()
  appearance: 'primary' | 'secondary' | 'icon' = 'primary';

  // only relevant in 'icon' mode
  @property()
  color: string;
  @property({ type: Boolean })
  applyFillColor = false;

  render() {
    return this.editor === 'vscode'
      ? this.renderVSCode()
      : this.renderIntellij();
  }

  renderVSCode() {
    if (this.appearance === 'icon') {
      return html`
        <vscode-button
          icon="${this.text}"
          style="
          --vscode-button-background: none;
          --vscode-button-foreground: ${this.color ??
          'var(--foreground-color)'};
          --vscode-button-hoverBackground: var(--field-nav-hover-color);"
          class="h-[1.25rem] w-[1.25rem]"
        >
        </vscode-button>
      `;
    }
    return html`<vscode-button ?secondary="${this.appearance === 'secondary'}"
      >${this.text}</vscode-button
    >`;
  }

  renderIntellij() {
    if (this.appearance === 'icon') {
      return html`<div
        class="hover:bg-fieldNavHoverBackground cursor-pointer rounded p-1"
      >
        <icon-element
          icon="${this.text}"
          color="${this.color}"
          ?applyFillColor="${this.applyFillColor}"
        ></icon-element>
      </div>`;
    }
    return html`<button
      class="${intellijFocusRing} ${this.appearance === 'primary'
        ? 'bg-primary focus:!ring-offset-1 focus:!ring-offset-background'
        : 'border !border-fieldBorder focus:!border-focusBorder"}'} whitespace-nowrap rounded px-4 py-1"
    >
      ${this.text}
    </button>`;
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
