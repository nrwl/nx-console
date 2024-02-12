import {
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
} from '@nx-console/language-server/types';
import { GeneratorCollectionInfo } from '@nx-console/shared/schema';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getGenerators(
  options?: NxGeneratorsRequestOptions
): Promise<GeneratorCollectionInfo[]> {
  return sendRequest(NxGeneratorsRequest, { options });
}
