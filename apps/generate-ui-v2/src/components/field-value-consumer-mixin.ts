import { ContextConsumer } from '@lit/context';
import { LitElement } from 'lit';
import { formValuesServiceContext } from '../form-values.service';
import { submittedContext } from '../contexts/submitted-context';
import { state } from 'lit/decorators.js';
import { Option } from '@nx-console/shared/schema';
import { GeneratorContext } from '@nx-console/shared/generate-ui-types';
import { generatorContextContext } from '../contexts/generator-context-context';

type Constructor<T> = new (...args: any[]) => T;

export declare class FieldValueConsumerInterface {
  protected option: Option;
  protected validation: boolean | string | undefined;
  protected touched: boolean;
  protected isDefaultValue: boolean;
  protected submitted: boolean;
  protected generatorContext: GeneratorContext | undefined;
  protected shouldRenderChanged(): boolean;
  protected shouldRenderError(): boolean;
}

export const FieldValueConsumer = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class FieldValueConsumerElement extends superClass {
    protected option: Option;

    @state()
    private validation: string | boolean | undefined;

    @state()
    private touched = false;

    @state()
    private isDefaultValue = true;

    @state()
    private submitted = false;

    @state() generatorContext: GeneratorContext | undefined;

    constructor(...rest: any[]) {
      super();
      new ContextConsumer(this, {
        context: formValuesServiceContext,
        callback: (service) => {
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

    protected createRenderRoot() {
      return this;
    }
  }

  return FieldValueConsumerElement as unknown as Constructor<FieldValueConsumerInterface> &
    T;
};
