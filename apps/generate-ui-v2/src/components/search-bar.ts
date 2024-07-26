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
            class="${intellijFieldColors} ${intellijFocusRing} text-foreground w-full rounded px-2 py-2 pl-8 text-black"
            type="text"
            placeholder="Search..."
            @input="${this.handleInput}"
            id="search-bar"
          />
          <icon-element
            icon="search"
            class="absolute left-2 top-[0.7rem]"
          ></icon-element>
          <div class="absolute right-2 top-2.5">
            <kbd
              class="border-fieldBorder bg-selectFieldBackground whitespace-nowrap rounded-md border p-1 shadow"
              >${this.getKeyboardShortcutSymbol()}S</kbd
            >
          </div>
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
          <div slot="end">
            <kbd class="bg-background whitespace-nowrap"
              >${this.getKeyboardShortcutSymbol()}S</kbd
            >
          </div>
        </vscode-text-field>
      `;
    }
  }

  clearSearch() {
    const inputElement = this.renderRoot.querySelector<HTMLInputElement>(
      this.editor === 'vscode' ? 'vscode-text-field' : 'input'
    );
    if (inputElement) {
      inputElement.value = '';
      inputElement.dispatchEvent(new Event('input'));
    }
  }

  getKeyboardShortcutSymbol() {
    if (window.navigator.platform.toLowerCase().includes('mac')) {
      return '⌘';
    } else {
      return 'Ctrl ';
    }
  }

  protected createRenderRoot() {
    return this;
  }

  private handleInput(e: Event) {
    const event = new CustomEvent('search-input', {
      detail: (e.target as HTMLInputElement).value,
    });
    this.dispatchEvent(event);
  }
}
