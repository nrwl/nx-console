import { Option } from '@nx-console/shared/schema';

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
  | GenerateUiRequestValidationOutputMessage;

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
};

export class GenerateUiRequestValidationOutputMessage {
  readonly payloadType = 'request-validation';

  constructor(
    public readonly payload: { formValues: FormValues; schema: GeneratorSchema }
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
  | GenerateUiValidationResultsInputMessage;

export class GenerateUiGeneratorSchemaInputMessage {
  readonly payloadType = 'generator';

  constructor(public readonly payload: GeneratorSchema) {}
}

export type GeneratorSchema = {
  collectionName: string;
  generatorName: string;
  description: string;
  options: Option[];
};

export class GenerateUiConfigurationInputMessage {
  readonly payloadType = 'config';

  constructor(public readonly payload: GenerateUiConfiguration) {}
}

export type GenerateUiConfiguration = {
  enableTaskExecutionDryRunOnChange: boolean;
};

export class GenerateUiStylesInputMessage {
  readonly payloadType = 'styles';

  constructor(public readonly payload: GenerateUiStyles) {}
}

export type GenerateUiStyles = {
  foregroundColor: string;
  backgroundColor: string;
  primaryColor: string;
  errorColor: string;
  fieldBackgroundColor: string;
  fieldBorderColor: string;
  focusBorderColor: string;
  selectFieldBackgroundColor: string;
  bannerWarningBackgroundColor: string;
  badgeBackgroundColor: string;
  separatorColor: string;
  fieldNavHoverColor: string;
  fontFamily: string;
};

export class GenerateUiBannerInputMessage {
  readonly payloadType = 'banner';

  constructor(
    public readonly payload: {
      message: string;
      type: 'warning' | 'error';
    }
  ) {}
}

export class GenerateUiValidationResultsInputMessage {
  readonly payloadType = 'validation-results';

  constructor(public readonly payload: ValidationResults) {}
}
