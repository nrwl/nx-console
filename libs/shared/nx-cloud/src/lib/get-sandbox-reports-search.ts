import { Logger, HttpError } from '@nx-console/shared-utils';
import { isNxCloudUsed } from './is-nx-cloud-used';
import { getNxCloudUrl } from './cloud-ids';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';
import { nxCloudRequest } from './nx-cloud-request';

export interface SandboxReportSearchRequest {
  runGroup: string;
  violationsOnly?: boolean;
  limit?: number;
  pageToken?: string;
}

export interface SandboxReportStats {
  totalFilesRead: number;
  totalFilesWritten: number;
  analysisTimeMs: number;
  unexpectedReads: number;
  unexpectedWrites: number;
  expectedInputsNotRead: number;
  expectedOutputsNotWritten: number;
}

export interface SandboxReportSummary {
  sandboxReportId: string;
  taskId: string;
  project: string;
  target: string;
  configuration: string | null;
  ciExecutionId: string;
  runGroup: string;
  createdAtMs: number;
  hasViolations: boolean;
  stats: SandboxReportStats;
}

export interface SandboxReportSearchResponse {
  items: SandboxReportSummary[];
  nextPageToken?: string;
}

export interface SandboxReportSearchError {
  type: 'authentication' | 'network' | 'other';
  message: string;
}

export async function getSandboxReportsSearch(
  workspacePath: string,
  logger: Logger,
  request: SandboxReportSearchRequest,
): Promise<{
  data?: SandboxReportSearchResponse;
  error?: SandboxReportSearchError;
}> {
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return {
      error: {
        type: 'other',
        message: 'Nx Cloud is not used in this workspace',
      },
    };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/mcp-context/sandbox-reports/search`;

  const headers: any = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  const data = JSON.stringify(request);

  logger.log(`Making sandbox reports search request`);
  try {
    const response = await nxCloudRequest('SANDBOX_REPORTS_SEARCH', {
      type: 'POST',
      url,
      headers,
      data,
      timeout: 10000,
    });

    const responseData = JSON.parse(
      response.responseText,
    ) as SandboxReportSearchResponse;
    return {
      data: responseData,
    };
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
      logger.log(`Authentication error: ${e.responseText}`);
      return {
        error: {
          type: 'authentication',
          message: e.responseText,
        },
      };
    }
    logger.log(`Error: ${JSON.stringify(e)}`);
    return {
      error: {
        type: 'other',
        message: e instanceof HttpError ? e.responseText : (e as Error).message,
      },
    };
  }
}

export function formatSandboxReportsSearchContent(
  data: SandboxReportSearchResponse,
): string[] {
  const content: string[] = [];

  if (data.items && data.items.length > 0) {
    content.push(`Found ${data.items.length} sandbox reports:`);

    for (const report of data.items) {
      let reportText = `- Task: ${report.taskId}\n`;
      reportText += `  Project: ${report.project}, Target: ${report.target}`;
      if (report.configuration) {
        reportText += `, Configuration: ${report.configuration}`;
      }
      reportText += `\n  Has Violations: ${report.hasViolations}\n`;
      reportText += `  Files Read: ${report.stats.totalFilesRead}, Files Written: ${report.stats.totalFilesWritten}\n`;
      reportText += `  Unexpected Reads: ${report.stats.unexpectedReads}, Unexpected Writes: ${report.stats.unexpectedWrites}`;
      if (
        report.stats.expectedInputsNotRead > 0 ||
        report.stats.expectedOutputsNotWritten > 0
      ) {
        reportText += `\n  Expected Inputs Not Read: ${report.stats.expectedInputsNotRead}, Expected Outputs Not Written: ${report.stats.expectedOutputsNotWritten}`;
      }
      reportText += `\n  Analysis Time: ${report.stats.analysisTimeMs}ms`;
      reportText += `\n  Report ID: ${report.sandboxReportId}`;
      content.push(reportText);
    }

    if (data.nextPageToken) {
      content.push(`Next page token: ${data.nextPageToken}`);
    }
  } else {
    content.push('No sandbox reports found matching the criteria.');
  }

  return content;
}
