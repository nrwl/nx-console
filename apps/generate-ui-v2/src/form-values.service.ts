import { createContext } from '@lit-labs/context';
import { IdeCommunicationController } from './ide-communication.controller';

import { extractDefaultValue } from './generator-schema-utils';
import {
  FormValues,
  GenerateUiRequestValidationOutputMessage,
  GeneratorSchema,
  ValidationResults,
} from '@nx-console/shared/generate-ui-types';

export const formValuesServiceContext = createContext<FormValuesService>(
  Symbol('form-values')
);

export class FormValuesService {
  private formValues: FormValues = {};
  private validationResults: ValidationResults = {};

  private validationListeners: Record<
    string,
    ((value: string | boolean | undefined) => void)[]
  > = {};

  private defaultValueListeners: Record<
    string,
    ((isDefault: boolean) => void)[]
  > = {};

  private touchedListeners: Record<string, ((isTouched: boolean) => void)[]> =
    {};

  constructor(
    private icc: IdeCommunicationController,
    private validFormCallback: () => void
  ) {
    window.addEventListener('option-changed', async (e: CustomEventInit) => {
      // update internal state
      this.formValues = {
        ...this.formValues,
        [e.detail.name]: e.detail.value,
      };

      this.validationResults = await this.validate(
        this.formValues,
        this.icc.generatorSchema
      );

      // notify consumers of changes
      Object.entries(this.validationListeners).forEach(([key, callbacks]) => {
        callbacks?.forEach((callback) => callback(this.validationResults[key]));
      });
      if (!e.detail.isDefaultValue) {
        if (Object.keys(this.validationResults).length === 0) {
          this.validFormCallback();
        }
        this.touchedListeners[e.detail.name]?.forEach((callback) =>
          callback(true)
        );
      }
      if (this.defaultValueListeners[e.detail.name]) {
        this.defaultValueListeners[e.detail.name]?.forEach((callback) =>
          callback(e.detail.isDefaultValue)
        );
      }
    });
  }

  private async validate(
    formValues: FormValues,
    schema: GeneratorSchema | undefined
  ): Promise<ValidationResults> {
    if (!schema) return {};
    const options = schema.options;
    const errors: Record<string, boolean | string> = {};
    Object.entries(formValues).forEach(([key, value]) => {
      const option = options.find((option) => option.name === key);
      if (!value && option?.isRequired) {
        errors[key] = 'This field is required';
      }
    });

    const pluginValidationResults = await this.icc.getValidationResults(
      formValues,
      schema
    );

    return { ...errors, ...pluginValidationResults };
  }

  registerValidationListener(
    key: string,
    listener: (value: string | boolean | undefined) => void
  ) {
    if (!this.validationListeners[key]) this.validationListeners[key] = [];
    this.validationListeners[key].push(listener);
  }

  registerDefaultValueListener(
    key: string,
    listener: (isDefault: boolean) => void
  ) {
    if (!this.defaultValueListeners[key]) this.defaultValueListeners[key] = [];
    this.defaultValueListeners[key].push(listener);
  }

  registerTouchedListener(key: string, listener: (isTouched: boolean) => void) {
    if (!this.touchedListeners[key]) this.touchedListeners[key] = [];
    this.touchedListeners[key].push(listener);
  }

  getSerializedFormValues(): string[] {
    const args: string[] = [];
    Object.entries(this.formValues).forEach(([key, value]) => {
      const option = this.icc.generatorSchema?.options.find(
        (option) => option.name === key
      );
      const defaultValue = extractDefaultValue(option);
      if (defaultValue === value) return;
      if (!defaultValue && !value) return;
      if (Array.isArray(value) && defaultValue === value) return;
      args.push(`--${key}=${value}`);
    });
    return args;
  }
}
