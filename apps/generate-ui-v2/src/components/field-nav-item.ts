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
        @click="${this.handleTreeClickEvent}"
        class="text-ellipsis ${this.shouldRenderError()
          ? 'text-red-500'
          : this.shouldRenderChanged()
          ? 'text-blue-500'
          : 'text-foreground'} 
          hover:bg-fieldNavBackground"
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
