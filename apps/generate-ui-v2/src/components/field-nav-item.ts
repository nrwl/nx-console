import { ContextConsumer } from '@lit-labs/context';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { formValuesServiceContext } from '../form-values.service';
import { FieldValueConsumer } from './field-value-consumer-mixin';
import { Option } from '@nx-console/shared/schema';

@customElement('field-nav-item')
export class FieldNavItem extends FieldValueConsumer(LitElement) {
  @property()
  protected option: Option;

  render() {
    return html`
      <li
        data-cy="field-nav-item-${this.option.name}"
        @click="${this.handleTreeClickEvent}"
        class="text-ellipsis overflow-hidden  cursor-pointer ${this.shouldRenderError()
          ? 'text-error'
          : this.shouldRenderChanged()
          ? 'text-primary'
          : 'text-foreground'} 
          hover:bg-fieldNavHoverBackground"
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
