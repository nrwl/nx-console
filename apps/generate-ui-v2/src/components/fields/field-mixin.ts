import { LitElement, PropertyValueMap } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Option } from '@nx-console/shared/schema';
import { ContextConsumer } from '@lit-labs/context';
import { EditorContext, EditorContextInterface } from '../../editor-context';
import { formValuesServiceContext } from '../../form-values.service';
import { extractDefaultValue } from '../../generator-schema-utils';

type Constructor<T> = new (...args: any[]) => T;

export declare class FieldInterface {
  option: Option;
  protected validation: boolean | string | undefined;
  protected dispatchValue(value: unknown): void;
  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ): void;
  protected isValid(): boolean;
}

export const Field = <T extends Constructor<LitElement>>(superClass: T) => {
  class FieldElement extends EditorContext(superClass) {
    @property()
    option: Option;

    @state()
    protected validation: boolean | string | undefined;

    protected dispatchValue(
      value: string | boolean | number | string[] | undefined,
      isDefaultValue = false
    ) {
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

    constructor(...rest: any[]) {
      super();
      // we can't use the @consume decorator due to mixin typing quirks
      new ContextConsumer(this, {
        context: formValuesServiceContext,
        callback: (service) => {
          service.registerValidationListener(
            this.option.name,
            (value) => (this.validation = value)
          );
        },
        subscribe: false,
      });
    }

    protected firstUpdated(
      _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
    ): void {
      super.updated(_changedProperties);
      const defaultValue = extractDefaultValue(this.option);

      if (defaultValue) {
        this.setFieldValue(defaultValue);
      }
      this.dispatchValue(defaultValue, true);
    }

    protected setFieldValue(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      value: string | boolean | number | string[] | undefined
    ): void {
      throw new Error('Not implemented');
    }

    protected createRenderRoot(): Element | ShadowRoot {
      return this;
    }

    isValid(): boolean {
      return this.validation === undefined || this.validation === true;
    }
  }

  return FieldElement as unknown as Constructor<
    FieldInterface & EditorContextInterface
  > &
    T;
};
