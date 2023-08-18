import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('popover-element')
export class Popover extends LitElement {
  @property({ type: String })
  content = '';

  @state()
  isPopoverVisible = false;

  constructor() {
    super();
    this.addEventListener('mouseover', this.showTooltip);
    this.addEventListener('mouseout', this.hideTooltip);
  }

  showTooltip() {
    this.isPopoverVisible = true;
  }

  hideTooltip() {
    this.isPopoverVisible = false;
  }

  render() {
    return html`
      <div class="relative inline-block">
        <slot></slot>
        <div
          class="${this.isPopoverVisible
            ? 'block'
            : 'hidden'}  tooltip-content border-fieldBorder bg-badgeBackground text-foreground absolute left-0 z-10 w-max max-w-md whitespace-normal border p-1 shadow-md"
          data-cy="popover-content"
        >
          ${this.content}
        </div>
      </div>
    `;
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
