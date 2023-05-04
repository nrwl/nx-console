import { createContext } from '@lit-labs/context';
import { IdeCommunicationController } from './ide-communication.controller';
import { Option } from '@nx-console/shared/schema';

import { FormValues, extractDefaultValue } from './generator-schema-utils';

export const formValuesServiceContext = createContext<FormValuesService>(
  Symbol('form-values')
);

export class FormValuesService {
  private formValues: FormValues = {};
  private validationMap: Record<string, string | boolean> = {};

  private validationListeners: Record<
    string,
    (value: string | boolean | undefined) => void
  > = {};

  constructor(
    private icc: IdeCommunicationController,
    private validFormCallback: () => void
  ) {
    window.addEventListener('option-changed', (e: CustomEventInit) => {
      // update internal state
      this.formValues = {
        ...this.formValues,
        [e.detail.name]: e.detail.value,
      };

      this.validationMap = this.validate(
        this.formValues,
        this.icc.generatorSchema?.options || []
      );

      // notify consumers of changes
      Object.entries(this.validationListeners).forEach(([key, callback]) => {
        callback(this.validationMap[key]);
      });
      if (!e.detail.isDefaultValue) {
        if (Object.keys(this.validationMap).length === 0) {
          this.validFormCallback();
        }
      }
    });
  }

  private validate(
    formValues: FormValues,
    options: Option[]
  ): Record<string, boolean | string> {
    const errors: Record<string, boolean | string> = {};
    Object.entries(formValues).forEach(([key, value]) => {
      const option = options.find((option) => option.name === key);
      if (!value && option?.isRequired) {
        errors[key] = 'This field is required';
      }
    });
    return errors;
  }

  registerValidationListener(
    key: string,
    listener: (value: string | boolean | undefined) => void
  ) {
    this.validationListeners[key] = listener;
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
