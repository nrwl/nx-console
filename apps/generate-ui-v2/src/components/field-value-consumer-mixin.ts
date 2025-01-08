import { ContextConsumer } from '@lit-labs/context';
import { LitElement } from 'lit';
import {
  FormValuesService,
  formValuesServiceContext,
} from '../form-values.service';
import { submittedContext } from '../contexts/submitted-context';
import { state } from 'lit/decorators.js';
import { Option } from '@nx-console/shared-schema';
import {
  FormValues,
  GeneratorContext,
} from '@nx-console/shared-generate-ui-types';
import { generatorContextContext } from '../contexts/generator-context-context';

type Constructor<T> = new (...args: any[]) => T;

export declare class FieldValueConsumerInterface {
  option: Option;
  validation: boolean | string | undefined;
  touched: boolean;
  isDefaultValue: boolean;
  submitted: boolean;
  generatorContext: GeneratorContext | undefined;
  shouldRenderChanged(): boolean;
  shouldRenderError(): boolean;
  getFormValues(): FormValues;
}

export const FieldValueConsumer = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class FieldValueConsumerElement extends superClass {
    option: Option;

    @state()
    validation: string | boolean | undefined;

    @state()
    touched = false;

    @state()
    isDefaultValue = true;

    @state()
    submitted = false;

    private formValuesService: FormValuesService;

    protected getFormValues() {
      return this.formValuesService.getFormValues();
    }

    @state() generatorContext: GeneratorContext | undefined;

    constructor(...rest: any[]) {
      super();
      new ContextConsumer(this, {
        context: formValuesServiceContext,
        callback: (service) => {
          this.formValuesService = service;
          service.registerValidationListener(
            this.option.name,
            (value) => (this.validation = value)
          );
          service.registerTouchedListener(
            this.option.name,
            (value) => (this.touched = value)
          );
          service.registerDefaultValueListener(
            this.option.name,
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
      new ContextConsumer(this, {
        context: generatorContextContext,
        callback: (generatorContext) =>
          (this.generatorContext = generatorContext),
        subscribe: true,
      });
    }

    shouldRenderError(): boolean {
      return (
        this.validation !== undefined &&
        this.validation !== true &&
        (this.touched || this.submitted)
      );
    }

    shouldRenderChanged(): boolean {
      return this.touched && !this.isDefaultValue;
    }

    createRenderRoot(): Element | ShadowRoot {
      return this;
    }
  }

  return FieldValueConsumerElement as unknown as Constructor<FieldValueConsumerInterface> &
    T;
};
