import { getTelemetry } from '@nx-console/vscode-telemetry';
import {
  CancellationToken,
  chat,
  ChatContext,
  ChatRequest,
  ChatRequestHandler,
  ChatResponseStream,
  ChatResultFeedbackKind,
  ExtensionContext,
  Uri,
} from 'vscode';

export function initCopilot(context: ExtensionContext) {
  const telemetry = getTelemetry();
  const nxParticipant = chat.createChatParticipant(
    'nx-console.nx',
    handler(context),
  );
  nxParticipant.iconPath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'nx.png',
  );
  nxParticipant.onDidReceiveFeedback((feedback) => {
    telemetry.logUsage(
      feedback.kind === ChatResultFeedbackKind.Helpful
        ? 'ai.feedback-good'
        : 'ai.feedback-bad',
    );
  });

  context.subscriptions.push(nxParticipant);
}

const handler: (context: ExtensionContext) => ChatRequestHandler =
  (extensionContext: ExtensionContext) =>
  async (
    request: ChatRequest,
    context: ChatContext,
    stream: ChatResponseStream,
    token: CancellationToken,
  ) => {
    const telemetry = getTelemetry();
    telemetry.logUsage('ai.chat-message');

    // Show deprecation message

    throw new Error(
      '**@nx has been removed.** Please use Agent mode with the Nx MCP server instead.\n',
    );

    return { metadata: { command: 'deprecated' } };
  };
