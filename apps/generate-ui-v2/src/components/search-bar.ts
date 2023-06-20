import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';
import { intellijFieldColors, intellijFocusRing } from '../utils/ui-utils';

@customElement('search-bar')
export class SearchBar extends EditorContext(LitElement) {
  render() {
    if (this.editor === 'intellij') {
      return html`
        <div class="relative inline-block w-full">
          <input
            class="w-full px-2 py-2 pl-8 text-black ${intellijFieldColors} ${intellijFocusRing} text-foreground rounded"
            type="text"
            placeholder="Search..."
            @input="${this.handleInput}"
            id="search-bar"
          />
          <icon-element
            icon="search"
            class="absolute left-2 top-[0.7rem]"
          ></icon-element>
        </div>
      `;
    } else {
      return html`
        <vscode-text-field
          class="w-full"
          placeholder="Search..."
          type="text"
          @input="${this.handleInput}"
          id="search-bar"
        >
          <span slot="start">
            <icon-element icon="search"></icon-element>
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
