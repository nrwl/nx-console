import { NxTransformedGeneratorSchemaRequest } from '@nx-console/language-server/types';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getTransformedGeneratorSchema(
  schema: GeneratorSchema
): Promise<GeneratorSchema> {
  return sendRequest(NxTransformedGeneratorSchemaRequest, schema);
}
