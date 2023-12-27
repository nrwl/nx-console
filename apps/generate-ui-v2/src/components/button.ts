import { ContextConsumer } from '@lit-labs/context';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { editorContext } from '../contexts/editor-context';
import { intellijFocusRing } from '../utils/ui-utils';

@customElement('button-element')
export class Button extends LitElement {
  @property()
  text: string;

  @property()
  appearance: 'primary' | 'secondary' | 'icon' = 'primary';

  // only relevant in 'icon' mode
  @property()
  color: string;

  editor: string;

  constructor() {
    super();
    new ContextConsumer(this, {
      context: editorContext,
      callback: (value) => {
        this.editor = value;
      },
      subscribe: false,
    });
  }

  render() {
    return this.editor === 'vscode'
      ? this.renderVSCode()
      : this.renderIntellij();
  }

  renderVSCode() {
    if (this.appearance === 'icon') {
      return html`
        <vscode-button appearance="icon">
          <icon-element
            class="flex items-start"
            icon="${this.text}"
            color="${this.color}"
          ></icon-element>
        </vscode-button>
      `;
    }
    return html`<vscode-button appearance="${this.appearance}"
      >${this.text}</vscode-button
    >`;
  }

  renderIntellij() {
    if (this.appearance === 'icon') {
      return html`<div class="hover:bg-fieldNavHoverBackground rounded p-1">
        <icon-element icon="${this.text}" color="${this.color}"></icon-element>
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
