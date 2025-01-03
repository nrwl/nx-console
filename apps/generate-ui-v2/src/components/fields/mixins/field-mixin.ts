import { FormValues } from '@nx-console/shared-generate-ui-types';
import { Option } from '@nx-console/shared-schema';
import { LitElement, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import {
  EditorContext,
  EditorContextInterface,
} from '../../../contexts/editor-context';
import {
  compareWithDefaultValue,
  extractDefaultValue,
} from '../../../utils/generator-schema-utils';
import {
  FieldValueConsumer,
  FieldValueConsumerInterface,
} from '../../field-value-consumer-mixin';

type Constructor<T> = new (...args: any[]) => T;

export type OptionChangedDetails = {
  name: string;
  value: string | number | boolean | string[] | undefined;
  isDefaultValue: boolean;
};

export declare class FieldInterface {
  option: Option;
  renderField(): TemplateResult;
  validation: boolean | string | undefined;
  touched: boolean;
  getFormValues(): FormValues;
  dispatchValue(value: string | boolean | number | string[] | undefined): void;
  setFieldValue(value: string | boolean | number | string[] | undefined): void;
  fieldId: string;
  ariaAttributes: Record<string, string>;
}

export const Field = <T extends Constructor<LitElement>>(superClass: T) => {
  class FieldElement extends FieldValueConsumer(EditorContext(superClass)) {
    @property()
    option: Option;

    dispatchValue(value: string | boolean | number | string[] | undefined) {
      const defaultValue = extractDefaultValue(this.option);
      const isDefaultValue = compareWithDefaultValue(value, defaultValue);

      this.dispatchEvent(
        new CustomEvent<OptionChangedDetails>('option-changed', {
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

    firstUpdated(
      _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
    ): void {
      super.updated(_changedProperties);
      if (this.generatorContext) {
        const prefillValue =
          this.generatorContext.prefillValues?.[this.option.name];
        if (prefillValue) {
          this.setFieldValue(prefillValue);
          this.dispatchValue(prefillValue);
          return;
        }
      }

      const defaultValue = extractDefaultValue(this.option);

      if (defaultValue) {
        this.setFieldValue(defaultValue);
        this.dispatchValue(defaultValue);
        return;
      }

      const value = this.getFormValues()[this.option.name];
      if (value) {
        this.setFieldValue(value);
        this.dispatchValue(value);
        return;
      }

      this.dispatchValue(undefined);
    }

    get fieldId(): string {
      return `${this.option.name}-field`;
    }

    get ariaAttributes(): Record<
      'id' | 'aria-invalid' | 'aria-describedby',
      string
    > {
      return {
        id: this.fieldId,
        'aria-invalid': `${this.shouldRenderError()}`,
        'aria-describedby': `${this.fieldId}-error`,
      };
    }
    createRenderRoot(): Element | ShadowRoot {
      return this;
    }

    // placeholders for subclasses
    setFieldValue(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      value: string | boolean | number | string[] | undefined
    ): void {
      throw new Error('Not implemented');
    }

    renderField(): TemplateResult {
      throw new Error('Not implemented');
    }
  }

  return FieldElement as unknown as Constructor<
    FieldInterface & EditorContextInterface & FieldValueConsumerInterface
  > &
    T;
};
