import { ContextProvider, createContext } from '@lit-labs/context';
import { IdeCommunicationController } from './ide-communication.controller';

import {
  compareWithDefaultValue,
  debounce,
  extractDefaultValue,
  getGeneratorIdentifier,
} from './utils/generator-schema-utils';
import {
  FormValues,
  GenerateUiCopyToClipboardOutputMessage,
  GeneratorSchema,
  ValidationResults,
} from '@nx-console/shared/generate-ui-types';
import { OptionChangedDetails } from './components/fields/mixins/field-mixin';
import { Root } from './main';
import { submittedContext } from './contexts/submitted-context';

export const formValuesServiceContext = createContext<FormValuesService>(
  Symbol('form-values')
);

export class FormValuesService {
  private cwdValue: string | undefined = undefined;
  private formValues: FormValues = {};
  private validationResults: ValidationResults = {};

  private icc: IdeCommunicationController;

  private submittedContextProvider: ContextProvider<{ __context__: boolean }>;

  constructor(rootElement: Root) {
    this.icc = rootElement.icc;
    this.submittedContextProvider = new ContextProvider(rootElement, {
      context: submittedContext,
      initialValue: false,
    });
    new ContextProvider(rootElement, {
      context: formValuesServiceContext,
      initialValue: this,
    });

    window.addEventListener(
      'option-changed',
      (e: CustomEventInit<OptionChangedDetails>) => {
        if (!e.detail) return;
        this.handleOptionChange(e.detail);
      }
    );
    window.addEventListener(
      'cwd-changed',
      async (e: CustomEventInit<string>) => {
        if (e.detail === undefined) return;
        const firstChange = this.cwdValue === undefined;
        this.cwdValue = e.detail;
        if (
          !firstChange &&
          this.icc.configuration?.enableTaskExecutionDryRunOnChange
        ) {
          this.validationResults = await this.validate(
            this.formValues,
            this.icc.generatorSchema
          );
          if (Object.keys(this.validationResults).length === 0) {
            this.debouncedRunGenerator(true);
          }
        }
      }
    );
  }

  private async handleOptionChange(details: OptionChangedDetails) {
    this.formValues = {
      ...this.formValues,
      [details.name]: details.value,
    };

    this.validationResults = await this.validate(
      this.formValues,
      this.icc.generatorSchema
    );

    // notify consumers of changes
    Object.entries(this.validationListeners).forEach(([key, callbacks]) => {
      callbacks?.forEach((callback) => callback(this.validationResults[key]));
    });

    if (!details.isDefaultValue) {
      if (Object.keys(this.validationResults).length === 0) {
        if (this.icc.configuration?.enableTaskExecutionDryRunOnChange) {
          this.debouncedRunGenerator(true);
        }
      }
      this.touchedListeners[details.name]?.forEach((callback) =>
        callback(true)
      );
    }

    if (this.defaultValueListeners[details.name]) {
      this.defaultValueListeners[details.name]?.forEach((callback) =>
        callback(details.isDefaultValue)
      );
    }
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
      if (!option) return;
      if (option.pattern) {
        const regex = new RegExp(option.pattern);
        if (!regex.test(String(value))) {
          errors[key] = `Value should match the pattern '${option.pattern}'`;
        }
      }
      if (
        option.isRequired &&
        (!value || (Array.isArray(value) && value.length === 0))
      ) {
        errors[key] = 'This field is required';
      }
    });

    const pluginValidationResults = await this.icc.getValidationResults(
      formValues,
      schema
    );

    return { ...errors, ...pluginValidationResults };
  }

  runGenerator(dryRun = false) {
    const args = this.getSerializedFormValues();
    args.push('--no-interactive');
    if (dryRun) {
      args.push('--dry-run');
    }
    this.submittedContextProvider.setValue(true);
    this.icc.postMessageToIde({
      payloadType: 'run-generator',
      payload: {
        positional: getGeneratorIdentifier(this.icc.generatorSchema),
        flags: args,
        cwd: this.cwdValue?.toString(),
      },
    });
  }

  private debouncedRunGenerator = debounce(
    (dryRun: boolean) => this.runGenerator(dryRun),
    500
  );

  copyCommandToClipboard() {
    const args = this.getSerializedFormValues();
    const positional = getGeneratorIdentifier(this.icc.generatorSchema);
    const command = `nx g ${positional} ${args.join(' ')}`;
    if (this.icc.editor === 'vscode') {
      navigator.clipboard.writeText(command);
    } else {
      this.icc.postMessageToIde(
        new GenerateUiCopyToClipboardOutputMessage(command)
      );
    }
  }

  private getSerializedFormValues(): string[] {
    const args: string[] = [];
    const formValues = {
      ...this.formValues,
      ...(this.icc.generatorSchema?.context?.fixedFormValues ?? {}),
    };
    Object.entries(formValues).forEach(([key, value]) => {
      const option = this.icc.generatorSchema?.options.find(
        (option) => option.name === key
      );

      const defaultValue = extractDefaultValue(option);
      if (compareWithDefaultValue(value, defaultValue)) return;

      const valueString = value?.toString() ?? '';
      if (valueString.includes(' ')) {
        if (valueString.includes('"')) {
          args.push(`--${key}='${value}'`);
        } else {
          args.push(`--${key}="${value}"`);
        }
      } else {
        args.push(`--${key}=${value}`);
      }
    });
    return args;
  }

  /** listeners **/

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
}
