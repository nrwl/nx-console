import { NxCloudTerminalOutputRequest } from '@nx-console/language-server-types';
import { getNxlsClient } from '@nx-console/vscode-lsp-client';

export async function getNxCloudTerminalOutput(
  taskId: string,
  ciPipelineExecutionId: string | null,
  linkId: string | null,
): Promise<{ terminalOutput?: string; error?: string }> {
  return await getNxlsClient().sendRequest(NxCloudTerminalOutputRequest, {
    taskId,
    ciPipelineExecutionId,
    linkId,
  });
}
