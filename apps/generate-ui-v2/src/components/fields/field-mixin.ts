import { Option } from '@nx-console/shared/schema';
import { LitElement, PropertyValueMap, TemplateResult, html } from 'lit';
import { property } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import {
  EditorContext,
  EditorContextInterface,
} from '../../contexts/editor-context';
import {
  compareWithDefaultValue,
  extractDefaultValue,
} from '../../generator-schema-utils';
import {
  FieldValueConsumer,
  FieldValueConsumerInterface,
} from '../field-value-consumer-mixin';

type Constructor<T> = new (...args: any[]) => T;

export declare class FieldInterface {
  option: Option;
  protected fieldId: string;
  protected renderField(): TemplateResult;
  protected validation: boolean | string | undefined;
  protected touched: boolean;
  protected dispatchValue(
    value: string | boolean | number | string[] | undefined
  ): void;
  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ): void;
  protected shouldRenderError(): boolean;
}

export const Field = <T extends Constructor<LitElement>>(superClass: T) => {
  class FieldElement extends FieldValueConsumer(EditorContext(superClass)) {
    @property()
    option: Option;

    protected get fieldId(): string {
      return `${this.option.name}-field`;
    }

    protected render() {
      return html`
        <div
          class="flex flex-col py-1 my-2 pl-3 border-l-4 ${this.shouldRenderError()
            ? 'border-red-500'
            : this.shouldRenderChanged()
            ? 'border-blue-500'
            : 'border-transparent'}"
        >
          <label for="${this.fieldId}"
            >${this.option.name}${this.option.isRequired ? '*' : ''}</label
          >
          <p class="text-sm text-gray-500">${this.option.description}</p>
          ${this.renderField()}
          ${when(
            this.shouldRenderError() && typeof this.validation === 'string',
            () => html`<p class="text-sm text-red-500">${this.validation}</p>`
          )}
        </div>
      `;
    }

    protected dispatchValue(
      value: string | boolean | number | string[] | undefined
    ) {
      const defaultValue = extractDefaultValue(this.option);
      const isDefaultValue = compareWithDefaultValue(value, defaultValue);

      this.dispatchEvent(
        new CustomEvent('option-changed', {
          bubbles: true,
          composed: true,
          detail: {
            name: this.option.name,
            value,
            isDefaultValue: isDefaultValue,
          },
        })
      );
    }

    protected firstUpdated(
      _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
    ): void {
      super.updated(_changedProperties);
      const defaultValue = extractDefaultValue(this.option);

      if (defaultValue) {
        this.setFieldValue(defaultValue);
      }
      this.dispatchValue(defaultValue);
    }

    protected createRenderRoot(): Element | ShadowRoot {
      return this;
    }

    // placeholders for subclasses
    protected setFieldValue(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      value: string | boolean | number | string[] | undefined
    ): void {
      throw new Error('Not implemented');
    }

    protected renderField(): TemplateResult {
      throw new Error('Not implemented');
    }
  }

  return FieldElement as unknown as Constructor<
    FieldInterface & EditorContextInterface & FieldValueConsumerInterface
  > &
    T;
};
