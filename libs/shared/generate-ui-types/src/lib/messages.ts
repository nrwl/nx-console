import { GeneratorSchema } from './generator-schema';

export type FormValues = Record<
  string,
  string | boolean | number | string[] | undefined
>;

export type ValidationResults = Record<string, string | boolean>;
/**
 * Output Messages
 */

export type GenerateUiOutputMessage =
  | GenerateUiFormInitOutputMessage
  | GenerateUiRunGeneratorOutputMessage
  | GenerateUiRequestValidationOutputMessage
  | GenerateUiCopyToClipboardOutputMessage
  | GenerateUiFillWithCopilotOutputMessage;

export class GenerateUiFormInitOutputMessage {
  readonly payloadType = 'output-init';
}

export class GenerateUiRunGeneratorOutputMessage {
  readonly payloadType = 'run-generator';

  constructor(public readonly payload: GenerateUiRunGeneratorPayload) {}
}

export type GenerateUiRunGeneratorPayload = {
  readonly positional: string;
  readonly flags: string[];
  readonly cwd?: string;
};

export class GenerateUiRequestValidationOutputMessage {
  readonly payloadType = 'request-validation';

  constructor(
    public readonly payload: {
      formValues: FormValues;
      schema: GeneratorSchema;
    },
  ) {}
}

export class GenerateUiCopyToClipboardOutputMessage {
  readonly payloadType = 'copy-to-clipboard';

  constructor(public readonly payload: string) {}
}

export class GenerateUiFillWithCopilotOutputMessage {
  readonly payloadType = 'fill-with-copilot';
  constructor(
    public readonly payload: {
      generatorName: string;
      formValues: FormValues;
    },
  ) {}
}

/**
 * Input Messages
 */

export type GenerateUiInputMessage =
  | GenerateUiGeneratorSchemaInputMessage
  | GenerateUiConfigurationInputMessage
  | GenerateUiStylesInputMessage
  | GenerateUiBannerInputMessage
  | GenerateUiValidationResultsInputMessage
  | GenerateUiUpdateFormValuesInputMessage;
export class GenerateUiGeneratorSchemaInputMessage {
  readonly payloadType = 'generator';

  constructor(public readonly payload: GeneratorSchema) {}
}

export class GenerateUiConfigurationInputMessage {
  readonly payloadType = 'config';

  constructor(public readonly payload: GenerateUiConfiguration) {}
}

export type GenerateUiConfiguration = {
  enableTaskExecutionDryRunOnChange: boolean;
  hasCopilot: boolean;
};

export class GenerateUiStylesInputMessage {
  readonly payloadType = 'styles';

  constructor(public readonly payload: GenerateUiStyles) {}
}

export type GenerateUiStyles = {
  foregroundColor: string;
  mutedForegroundColor: string;
  backgroundColor: string;
  primaryColor: string;
  errorColor: string;
  fieldBackgroundColor: string;
  fieldBorderColor: string;
  focusBorderColor: string;
  selectFieldBackgroundColor: string;
  activeSelectionBackgroundColor: string;
  bannerWarningBackgroundColor: string;
  bannerTextColor: string;
  badgeBackgroundColor: string;
  separatorColor: string;
  fieldNavHoverColor: string;
  scrollbarThumbColor: string;
  fontFamily: string;
  fontSize: string;
};

export class GenerateUiBannerInputMessage {
  readonly payloadType = 'banner';

  constructor(
    public readonly payload: {
      message: string;
      type: 'warning' | 'error';
    },
  ) {}
}

export class GenerateUiValidationResultsInputMessage {
  readonly payloadType = 'validation-results';

  constructor(public readonly payload: ValidationResults) {}
}

export class GenerateUiUpdateFormValuesInputMessage {
  readonly payloadType = 'update-form-values';

  constructor(public readonly payload: FormValues) {}
}
