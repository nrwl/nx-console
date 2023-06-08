import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { EditorContext } from '../editor-context';

@customElement('search-bar')
export class SearchBar extends EditorContext(LitElement) {
  render() {
    if (this.editor === 'intellij') {
      return html`
        <input
          class="w-full px-3 text-black border bg-fieldBackground border border-fieldBorder text-foreground"
          type="text"
          placeholder="Search..."
          @input="${this.handleInput}"
        />
      `;
    } else {
      return html`
        <vscode-text-field
          class="w-full"
          placeholder="Search..."
          type="text"
          @input="${this.handleInput}"
        >
          <span slot="start">
            <codicon-element icon="search"></codicon-element>
          </span>
        </vscode-text-field>
      `;
    }
  }

  private handleInput(e: Event) {
    const event = new CustomEvent('search-input', {
      detail: (e.target as HTMLInputElement).value,
    });
    this.dispatchEvent(event);
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
