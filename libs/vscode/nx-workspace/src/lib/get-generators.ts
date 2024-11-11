import {
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
} from '@nx-console/language-server/types';
import { GeneratorCollectionInfo } from '@nx-console/shared/schema';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export function getGenerators(
  options?: NxGeneratorsRequestOptions
): Promise<GeneratorCollectionInfo[] | undefined> {
  return getNxlsClient().sendRequest(NxGeneratorsRequest, { options });
}
