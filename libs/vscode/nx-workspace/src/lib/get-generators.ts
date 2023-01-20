import {
  NxGeneratorsRequestOptions,
  NxGeneratorsRequest,
} from '@nx-console/language-server/types';
import { CollectionInfo } from '@nx-console/shared/schema';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getGenerators(
  options?: NxGeneratorsRequestOptions
): Promise<CollectionInfo[]> {
  return sendRequest(NxGeneratorsRequest, { options });
}
