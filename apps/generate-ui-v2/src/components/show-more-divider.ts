import { css, html, LitElement } from 'lit';
import { EditorContext } from '../contexts/editor-context';
import { customElement, state } from 'lit/decorators.js';

@customElement('show-more-divider')
export class ShowMoreDivider extends EditorContext(LitElement) {
  @state()
  showMore = false;

  render() {
    return html`
      <div
        class="flex flex-row items-center space-x-4 pl-4"
        @click=${this.toggleShowMore}
      >
        <hr
          class="grow h-0 ${
            this.editor === 'intellij' ? 'border-separator' : ''
          }"
          style="${
            this.editor === 'vscode'
              ? 'border-top: calc(var(--border-width) * 1px) solid var(--divider-background);'
              : ''
          }"
        />

        <div tabindex="0" aria-role="button" class="focus:ring-1 focus:ring-focusBorder focus:outline-none" @keydown="${
          this.handleKeyEvent
        }">${
      this.showMore ? 'Show less options' : 'Show all options'
    } <icon-element icon="${
      this.showMore ? 'chevron-up' : 'chevron-down'
    }" class="align-sub"></div>
      </div>
    `;
  }

  handleKeyEvent(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.toggleShowMore();
    }
  }

  toggleShowMore() {
    this.showMore = !this.showMore;
    this.dispatchEvent(new CustomEvent('show-more', { detail: this.showMore }));
  }

  protected createRenderRoot() {
    return this;
  }
}
