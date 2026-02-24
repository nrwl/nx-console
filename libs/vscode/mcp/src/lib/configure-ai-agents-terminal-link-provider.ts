import {
  CancellationToken,
  commands,
  ProviderResult,
  TerminalLink,
  TerminalLinkContext,
  TerminalLinkProvider,
} from 'vscode';

const LINK_TEXT = 'nx configure-ai-agents';

export class ConfigureAiAgentsTerminalLinkProvider
  implements TerminalLinkProvider
{
  provideTerminalLinks(
    context: TerminalLinkContext,
    _: CancellationToken,
  ): ProviderResult<TerminalLink[]> {
    const line = context.line;
    const index = line.indexOf(LINK_TEXT);
    if (index === -1) {
      return [];
    }

    return [new TerminalLink(index, LINK_TEXT.length)];
  }

  handleTerminalLink(_: TerminalLink): ProviderResult<void> {
    commands.executeCommand('nx.configureAiAgents');
  }
}
