import { getNxCloudTerminalOutput } from '@nx-console/vscode-nx-workspace';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import { sendChatParticipantRequest } from '@vscode/chat-extension-utils';
import { PromptElementAndProps } from '@vscode/chat-extension-utils/dist/toolsPrompt';
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  ExtensionContext,
  LanguageModelChatMessage,
  LanguageModelToolCallPart,
  lm,
} from 'vscode';
import { NxCloudCipeFailurePrompt } from '../prompts/nx-cloud-cipe-failure';

interface CipeDetailsExtractorInput {
  linkId: string | null;
  executionId: string | null;
  taskId: string | null;
  error: string | null;
}

export async function explainCipe(
  request: ChatRequest,
  context: ChatContext,
  stream: ChatResponseStream,
  token: CancellationToken,
  extensionContext: ExtensionContext,
) {
  stream.progress('Gathering CIPE information...');

  const [model] = await lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4o',
  });
  const gatherIds = await model.sendRequest(
    [
      LanguageModelChatMessage.Assistant(
        `You are able to determine the linkId and taskId of the user's request.
    The linkId will be a consecutive range of numbers and letters, that will look similar to this: WQNrJZvbQk, KvQ1JlK9Uk, SoocW8Fzqa, etc.
    The taskId will be a a string that will have 1 or 2 semicolons in it, and will look similar to this: nx-cloud-tasks-runner:record-command, api:build, api:build:debug, nx:build-base, @source/repo:task, etc.

    If you cannot determine the linkId or taskId, provide an error message
    `,
      ),
      LanguageModelChatMessage.User(request.prompt),
    ],
    {
      tools: [lm.tools.find((tool) => tool.name === 'nx_cipe-details')],
    },
    token,
  );

  let cipeDetails: CipeDetailsExtractorInput | undefined;
  for await (const message of gatherIds.stream) {
    if (
      message instanceof LanguageModelToolCallPart &&
      message.name === 'nx_cipe-details'
    ) {
      cipeDetails = message.input as CipeDetailsExtractorInput;
    }
  }

  if (!cipeDetails) {
    throw new Error('Unable to gather linkId and taskId from the prompt.');
  }

  if (!cipeDetails.linkId && !cipeDetails.executionId) {
    throw new Error('Unable to gather linkId or executionId from the prompt.');
  }

  if (!cipeDetails.taskId) {
    throw new Error('Unable to gather taskId from the prompt.');
  }

  if (cipeDetails.error) {
    throw new Error(`Error gathering linkId and taskId: ${cipeDetails.error}`);
  }

  stream.progress('Retrieving terminal output from Nx Cloud...');
  const terminalOutputResponse = await getNxCloudTerminalOutput(
    cipeDetails.taskId,
    cipeDetails.executionId,
    cipeDetails.linkId,
  );

  if (terminalOutputResponse.error) {
    throw new Error(
      `Error retrieving terminal output from Nx Cloud: ${terminalOutputResponse.error}`,
    );
  }

  const result = await sendChatParticipantRequest(
    request,
    context,
    {
      prompt: {
        promptElement: NxCloudCipeFailurePrompt,
        props: {
          terminalOutput:
            terminalOutputResponse.terminalOutput ??
            'Could not retrieve terminal output',
          workspaceRoot: getWorkspacePath(),
          baseSha: undefined,
          headSha: undefined,
        },
      } as PromptElementAndProps<NxCloudCipeFailurePrompt>,
      responseStreamOptions: {
        stream,
        references: true,
        responseText: true,
      },
      extensionMode: extensionContext.extensionMode,
    },
    token,
  );

  await result.result;
}
