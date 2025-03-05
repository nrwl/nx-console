import {
  CancellationToken,
  ProviderResult,
  TerminalLink,
  TerminalLinkContext,
  TerminalLinkProvider,
} from 'vscode';
import { viewPackageJsonDiff } from './git-extension/view-diff';

export class DiffEditorTerminalLinkProvider implements TerminalLinkProvider {
  provideTerminalLinks(
    context: TerminalLinkContext,
    _: CancellationToken,
  ): ProviderResult<TerminalLink[]> {
    const line = context.line;
    const diffEditorText =
      'Inspect the package.json changes in the built-in diff editor [Click to open]';
    const index = line.indexOf(diffEditorText);
    if (index === -1) {
      return [];
    }

    return [new TerminalLink(index, diffEditorText.length)];
  }

  handleTerminalLink(_: TerminalLink): ProviderResult<void> {
    viewPackageJsonDiff();
  }
}
