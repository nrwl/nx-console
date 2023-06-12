import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume, ContextConsumer } from '@lit-labs/context';
import { editorContext } from '../contexts/editor-context';

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
      class="py-1 px-4 rounded-md ${this.appearance === 'primary'
        ? 'bg-primary'
        : 'border border-fieldBorder'}"
    >
      ${this.text}
    </button>`;
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
