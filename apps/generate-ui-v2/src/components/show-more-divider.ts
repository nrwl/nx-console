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
        @click=${this.handleClick}
      >
        <hr
          class="grow h-0"
          style="border-top: calc(var(--border-width) * 1px) solid
      var(--divider-background);"
        />

        <div>${
          this.showMore ? 'Show less options' : 'Show all options'
        } <icon-element icon="${
      this.showMore ? 'chevron-up' : 'chevron-down'
    }" class="align-sub"></div>
      </div>
    `;
  }

  handleClick() {
    this.showMore = !this.showMore;
    this.dispatchEvent(new CustomEvent('show-more', { detail: this.showMore }));
  }

  protected createRenderRoot() {
    return this;
  }
}
