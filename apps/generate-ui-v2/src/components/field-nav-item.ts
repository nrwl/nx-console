import { Option } from '@nx-console/shared/schema';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { FieldValueConsumer } from './field-value-consumer-mixin';

@customElement('field-nav-item')
export class FieldNavItem extends FieldValueConsumer(LitElement) {
  @property()
  protected option: Option;

  @property()
  greyedOut = false;

  render() {
    return html`
      <li
        data-cy="field-nav-item-${this.option.name}"
        @click="${this.handleTreeClickEvent}"
        class="${this.shouldRenderError()
          ? 'text-error'
          : this.shouldRenderChanged()
          ? 'text-primary'
          : this.greyedOut
          ? 'text-gray-500'
          : 'text-foreground'} hover:bg-fieldNavHoverBackground  cursor-pointer overflow-hidden 
          text-ellipsis"
      >
        ${this.option.name}
      </li>
    `;
  }

  private handleTreeClickEvent() {
    const event = new CustomEvent('click', {
      detail: this.option.name,
    });
    this.dispatchEvent(event);
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
