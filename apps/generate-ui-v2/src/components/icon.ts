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
      ></img>`;
    } else {
      return html`<codicon-element icon="${this.icon}"></codicon-element>`;
    }
  }
}
