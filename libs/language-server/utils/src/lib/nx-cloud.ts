import { isNxCloudUsed as sharedIsNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { lspLogger } from './lsp-log';

export const isNxCloudUsed = (path: string) => {
  return sharedIsNxCloudUsed(path, lspLogger);
};
