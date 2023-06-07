import { ContextConsumer } from '@lit-labs/context';
import { customElement, html, LitElement } from 'lit-element';
import { property, state } from 'lit/decorators.js';
import { formValuesServiceContext } from '../form-values.service';
import {
  shouldRenderChanged,
  shouldRenderError,
} from '../generator-schema-utils';
import { submittedContext } from '../contexts/submitted-context';

@customElement('field-tree-item')
export class FieldTreeItem extends LitElement {
  @property()
  optionName: string;

  @state()
  private validation: string | boolean | undefined;

  @state()
  private touched = false;

  @state()
  private isDefaultValue = true;

  @state()
  private submitted = false;

  constructor() {
    super();
    new ContextConsumer(this, {
      context: formValuesServiceContext,
      callback: (service) => {
        service.registerValidationListener(
          this.optionName,
          (value) => (this.validation = value)
        );
        service.registerTouchedListener(
          this.optionName,
          (value) => (this.touched = value)
        );
        service.registerDefaultValueListener(
          this.optionName,
          (value) => (this.isDefaultValue = value)
        );
      },
      subscribe: false,
    });
    new ContextConsumer(this, {
      context: submittedContext,
      callback: (submitted) => (this.submitted = submitted),
      subscribe: true,
    });
  }

  render() {
    return html`
      <li
        @click="${this.handleTreeClickEvent}"
        class="text-ellipsis ${shouldRenderError(
          this.validation,
          this.touched,
          this.submitted
        )
          ? 'text-red-500'
          : shouldRenderChanged(this.touched, this.isDefaultValue)
          ? 'text-blue-500'
          : 'text-foreground'}"
      >
        ${this.optionName}
      </li>
    `;
  }

  private handleTreeClickEvent() {
    const event = new CustomEvent('click', {
      detail: this.optionName,
    });
    this.dispatchEvent(event);
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
