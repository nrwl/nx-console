import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';

@customElement('icon-element')
export class Icon extends EditorContext(LitElement) {
  @property()
  icon: string;

  render() {
    if (this.editor === 'intellij') {
      return html`<img
        src="./icons/${this.icon}.svg"
        class="h-[1.25rem]"
      ></img>`;
    } else {
      return html`<span
        class="codicon codicon-${this.icon}"
        style="text-align: center; font-size: 0.9rem;"
      ></span>`;
    }
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
