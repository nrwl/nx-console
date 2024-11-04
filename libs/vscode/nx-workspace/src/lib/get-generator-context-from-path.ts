import { NxGeneratorContextFromPathRequest } from '@nx-console/language-server/types';
import { TaskExecutionSchema } from '@nx-console/shared/schema';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getGeneratorContextFromPath(
  generator: TaskExecutionSchema,
  path: string
): Promise<
  | {
      project?: string;
      projectName?: string;
      path?: string;
      directory?: string;
    }
  | undefined
> {
  return getNxlsClient().sendRequest(NxGeneratorContextFromPathRequest, {
    generator,
    path,
  });
}
