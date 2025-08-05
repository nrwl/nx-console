import { NxCloudOnboardingInfoRequest } from '@nx-console/language-server-types';
import { CloudOnboardingInfo } from '@nx-console/shared-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getCloudOnboardingInfo(
  force = false,
): Promise<CloudOnboardingInfo | undefined> {
  return getNxlsClient().sendRequest(NxCloudOnboardingInfoRequest, { force });
}
