import { CIPEInfo, CIPEInfoError } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';
import { getRecentCIPEData as getRecentCIPEDataFromCloud } from '@nx-console/shared-nx-cloud';

/**
 * Get recent CIPE (CI Pipeline Execution) data for the workspace.
 * This is a wrapper that delegates to the cloud implementation.
 * 
 * @param workspacePath - The path to the workspace
 * @param logger - Logger instance for logging
 * @returns Recent CIPE data including info, errors, and workspace URL
 */
export async function getRecentCIPEData(
  workspacePath: string,
  logger: Logger
): Promise<{
  info?: CIPEInfo[];
  error?: CIPEInfoError;
  workspaceUrl?: string;
}> {
  return getRecentCIPEDataFromCloud(workspacePath, logger);
}