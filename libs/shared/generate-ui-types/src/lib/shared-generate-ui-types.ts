import { Option } from '@nx-console/shared/schema';
/**
 * Output Messages
 */

export type GenerateUiOutputMessage =
  | GenerateUiFormInitOutputMessage
  | GenerateUiRunGeneratorOutputMessage;

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

/**
 * Input Messages
 */

export type GenerateUiInputMessage =
  | GenerateUiGeneratorSchemaInputMessage
  | GenerateUiConfigurationInputMessage
  | GenerateUiStylesInputMessage
  | GenerateUiBannerInputMessage;

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
  fieldBackgroundColor: string;
  fieldBorderColor: string;
  selectFieldBackgroundColor: string;
  bannerWarningBackgroundColor: string;
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
