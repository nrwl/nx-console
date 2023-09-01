import { Option } from '@nx-console/shared/schema';
import { LitElement, PropertyValueMap, TemplateResult, html } from 'lit';
import { property } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
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
  protected renderField(): TemplateResult;
  protected validation: boolean | string | undefined;
  protected touched: boolean;
  protected dispatchValue(
    value: string | boolean | number | string[] | undefined
  ): void;
  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ): void;
  protected fieldId: string;
  protected ariaAttributes: Record<string, string>;
}

export const Field = <T extends Constructor<LitElement>>(superClass: T) => {
  class FieldElement extends FieldValueConsumer(EditorContext(superClass)) {
    @property()
    option: Option;

    protected dispatchValue(
      value: string | boolean | number | string[] | undefined
    ) {
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

    protected firstUpdated(
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

      this.dispatchValue(undefined);
    }

    protected get fieldId(): string {
      return `${this.option.name}-field`;
    }

    protected get ariaAttributes(): Record<
      'id' | 'aria-invalid' | 'aria-describedby',
      string
    > {
      return {
        id: this.fieldId,
        'aria-invalid': `${this.shouldRenderError()}`,
        'aria-describedby': `${this.fieldId}-error`,
      };
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
