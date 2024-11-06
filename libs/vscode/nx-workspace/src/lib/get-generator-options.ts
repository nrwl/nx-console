import {
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
} from '@nx-console/language-server/types';
import { Option } from '@nx-console/shared/schema';
import { getNxlsClient } from '@nx-console/vscode/lsp-client';

export function getGeneratorOptions(
  options: NxGeneratorOptionsRequestOptions
): Promise<Option[] | undefined> {
  return getNxlsClient().sendRequest(NxGeneratorOptionsRequest, { options });
}
