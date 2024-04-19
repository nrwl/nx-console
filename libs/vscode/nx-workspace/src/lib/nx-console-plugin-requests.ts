import {
  NxStartupMessageRequest,
  NxTransformedGeneratorSchemaRequest,
} from '@nx-console/language-server/types';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { sendRequest } from '@nx-console/vscode/lsp-client';
import { StartupMessageDefinition } from 'shared/nx-console-plugins';

export function getTransformedGeneratorSchema(
  schema: GeneratorSchema
): Promise<GeneratorSchema | undefined> {
  return sendRequest(NxTransformedGeneratorSchemaRequest, schema);
}

export function getStartupMessage(
  schema: GeneratorSchema
): Promise<StartupMessageDefinition | undefined> {
  return sendRequest(NxStartupMessageRequest, schema);
}
