import { NxGeneratorContextV2Request } from '@nx-console/language-server/types';
import { GeneratorContext } from '@nx-console/shared/generate-ui-types';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export async function getGeneratorContextV2(
  path: string | undefined
): Promise<GeneratorContext | undefined> {
  return getNxlsClient().sendRequest(NxGeneratorContextV2Request, { path });
}
