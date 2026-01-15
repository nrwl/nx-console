import { Logger, httpRequest, HttpError } from '@nx-console/shared-utils';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export type UpdateSuggestedFixAction =
  | 'APPLIED'
  | 'REJECTED'
  | 'APPLIED_LOCALLY'
  | 'RERUN_REQUESTED';
export type UpdateSuggestedFixActionOrigin =
  | 'NX_CONSOLE_VSCODE'
  | 'NX_CONSOLE_INTELLIJ'
  | 'NX_CLI'
  | 'NX_MCP';

export interface UpdateSuggestedFixError {
  type: 'authentication' | 'network' | 'not_found' | 'other';
  message: string;
}

export interface UpdateSuggestedFixOptions {
  workspacePath: string;
  logger: Logger;
  aiFixId: string;
  action: UpdateSuggestedFixAction;
  actionOrigin: UpdateSuggestedFixActionOrigin;
  commitMessage?: string;
}

export async function updateSuggestedFix(
  options: UpdateSuggestedFixOptions,
): Promise<{
  success: boolean;
  error?: UpdateSuggestedFixError;
}> {
  const {
    workspacePath,
    logger,
    aiFixId,
    action,
    actionOrigin,
    commitMessage,
  } = options;
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      success: false,
      error: {
        type: 'other',
        message: `Nx Cloud is not used in this workspace (${workspacePath})`,
      },
    };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/update-suggested-fix`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const requestData: Record<string, string> = {
    aiFixId,
    action,
    actionOrigin,
  };
  if (commitMessage) {
    requestData.userCommitMessage = commitMessage;
  }
  const data = JSON.stringify(requestData);

  logger.log(`Making update-suggested-fix request with action: ${action}`);
  try {
    const response = await httpRequest({
      type: 'POST',
      url,
      headers,
      data,
      timeout: 10000,
    });

    if (response.status >= 200 && response.status < 300) {
      return { success: true };
    }

    return {
      success: false,
      error: {
        type: 'other',
        message: `Unexpected status ${response.status}: ${response.responseText}`,
      },
    };
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.status === 401) {
        logger.log(`Authentication error: ${e.responseText}`);
        return {
          success: false,
          error: {
            type: 'authentication',
            message: e.responseText,
          },
        };
      }
      if (e.status === 404) {
        logger.log(`Not found: ${e.responseText}`);
        return {
          success: false,
          error: {
            type: 'not_found',
            message: e.responseText,
          },
        };
      }
      logger.log(`Error: ${e.status} ${e.responseText}`);
      return {
        success: false,
        error: {
          type: 'other',
          message: e.responseText,
        },
      };
    }

    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.log(`Network error: ${errorMessage}`);
    return {
      success: false,
      error: {
        type: 'network',
        message: errorMessage,
      },
    };
  }
}
