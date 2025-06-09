import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { EditorContext, intellijFieldColors, intellijFocusRing } from '@nx-console/shared-ui-components';

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
        <vscode-textfield
          style="border-width: calc(var(--border-width)* 1px);"
          class="w-full"
          placeholder="Search..."
          type="text"
          @input="${this.handleInput}"
          id="search-bar"
        >
          <vscode-icon
            slot="content-before"
            name="search"
            title="search"
          ></vscode-icon>
          <div slot="content-after">
            <kbd class="bg-background whitespace-nowrap"
              >${this.getKeyboardShortcutSymbol()}S</kbd
            >
          </div>
        </vscode-textfield>
      `;
    }
  }

  clearSearch() {
    const inputElement = this.renderRoot.querySelector<HTMLInputElement>(
      this.editor === 'vscode' ? 'vscode-textfield' : 'input'
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

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  private handleInput(e: Event) {
    const event = new CustomEvent('search-input', {
      detail: (e.target as HTMLInputElement).value,
    });
    this.dispatchEvent(event);
  }
}
