import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume, ContextConsumer } from '@lit-labs/context';
import { editorContext } from '../contexts/editor-context';
import { intellijFocusRing } from '../utils/ui-utils';

@customElement('button-element')
export class Button extends LitElement {
  @property()
  text: string;

  @property()
  appearance: 'primary' | 'secondary' = 'primary';

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
    return html`<vscode-button appearance="${this.appearance}"
      >${this.text}</vscode-button
    >`;
  }

  renderIntellij() {
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
