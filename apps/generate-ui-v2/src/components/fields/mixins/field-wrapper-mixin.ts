import { html } from 'lit';
import { FieldInterface } from './field-mixin';
import { when } from 'lit/directives/when.js';
import { FieldValueConsumerInterface } from '../../field-value-consumer-mixin';
import { EditorContextInterface } from '../../../contexts/editor-context';

export const FieldWrapper = <
  T extends new (...args: any[]) => FieldInterface &
    EditorContextInterface &
    FieldValueConsumerInterface
>(
  base: T
) => {
  return class extends base {
    protected render() {
      return html`
        <div
          class="${this.shouldRenderError()
            ? 'border-error'
            : this.shouldRenderChanged()
            ? 'border-primary'
            : 'border-transparent'} flex flex-col border-l-4 py-2 pl-3"
        >
          <label for="${this.fieldId}"
            >${this.option.name}${this.option.isRequired ? '*' : ''}</label
          >
          <p class="mb-2 text-gray-500">${this.option.description}</p>
          ${this.renderField()}
          ${when(
            this.shouldRenderError() && typeof this.validation === 'string',
            () =>
              html`<p
                class="text-error ${when(
                  this.editor === 'intellij',
                  () => 'mt-1'
                )} text-sm"
                id="${this.fieldId}-error"
                aria-live="polite"
              >
                ${this.validation}
              </p>`
          )}
        </div>
      `;
    }
  };
};
