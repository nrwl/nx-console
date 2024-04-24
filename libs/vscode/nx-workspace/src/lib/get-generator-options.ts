import {
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
} from '@nx-console/language-server/types';
import { Option } from '@nx-console/shared/schema';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export function getGeneratorOptions(
  options: NxGeneratorOptionsRequestOptions
): Promise<Option[] | undefined> {
  return sendRequest(NxGeneratorOptionsRequest, { options });
}
