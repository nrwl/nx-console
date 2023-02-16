import { NxVersionRequest } from '@nx-console/language-server/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';
import { SemVer } from 'semver';

export async function getNxVersion(): Promise<SemVer> {
  return sendRequest(NxVersionRequest, undefined);
}
