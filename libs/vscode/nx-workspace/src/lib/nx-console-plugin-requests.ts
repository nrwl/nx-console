import {
  NxStartupMessageRequest,
  NxTransformedGeneratorSchemaRequest,
} from '@nx-console/language-server/types';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';
import { StartupMessageDefinition } from 'shared/nx-console-plugins';

export function getTransformedGeneratorSchema(
  schema: GeneratorSchema
): Promise<GeneratorSchema | undefined> {
  return getNxlsClient().sendRequest(
    NxTransformedGeneratorSchemaRequest,
    schema
  );
}

export function getStartupMessage(
  schema: GeneratorSchema
): Promise<StartupMessageDefinition | undefined> {
  return getNxlsClient().sendRequest(NxStartupMessageRequest, schema);
}
