import { LitElement, PropertyValueMap, TemplateResult, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Option } from '@nx-console/shared/schema';
import { ContextConsumer, consume } from '@lit-labs/context';
import {
  EditorContext,
  EditorContextInterface,
} from '../../contexts/editor-context';
import { formValuesServiceContext } from '../../form-values.service';
import { extractDefaultValue } from '../../generator-schema-utils';
import { when } from 'lit/directives/when.js';
import { submittedContext } from '../../contexts/submitted-context';

type Constructor<T> = new (...args: any[]) => T;

export declare class FieldInterface {
  option: Option;
  protected renderField(): TemplateResult;
  protected validation: boolean | string | undefined;
  protected touched: boolean;
  protected dispatchValue(value: unknown): void;
  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ): void;
  protected shouldRenderError(): boolean;
}

export const Field = <T extends Constructor<LitElement>>(superClass: T) => {
  class FieldElement extends EditorContext(superClass) {
    @property()
    option: Option;

    @state()
    protected validation: boolean | string | undefined;

    @state()
    protected touched = false;

    @state()
    private submitted = false;

    protected render() {
      return html`
        <div class="flex flex-col mb-4">
          <p class="">
            ${this.option.name}${this.option.isRequired ? '*' : ''}
          </p>
          <p class="text-sm text-gray-500">${this.option.description}</p>
          ${this.renderField()}
          ${when(
            this.shouldRenderError() && typeof this.validation === 'string',
            () => html`<p class="text-sm text-red-500">${this.validation}</p>`
          )}
        </div>
      `;
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
      new ContextConsumer(this, {
        context: submittedContext,
        callback: (submitted) => (this.submitted = submitted),
        subscribe: true,
      });
    }

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
      if (!isDefaultValue) {
        this.touched = true;
      }
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

    protected createRenderRoot(): Element | ShadowRoot {
      return this;
    }

    shouldRenderError(): boolean {
      return (
        this.validation !== undefined &&
        this.validation !== true &&
        (this.touched || this.submitted)
      );
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
    FieldInterface & EditorContextInterface
  > &
    T;
};
