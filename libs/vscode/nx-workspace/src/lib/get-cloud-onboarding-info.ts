import { NxCloudOnboardingInfoRequest } from '@nx-console/language-server/types';
import { CloudOnboardingInfo } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getCloudOnboardingInfo(): Promise<
  CloudOnboardingInfo | undefined
> {
  return sendRequest(NxCloudOnboardingInfoRequest, undefined);
}
