import { AbstractTreeProvider } from '@nx-console/utils';
import { join } from 'path';
import { ExtensionContext, ProviderResult, ThemeIcon, Uri } from 'vscode';
import { NxHelpAndFeedbackTreeItem } from './nx-help-and-feedback-tree-item';

export class NxHelpAndFeedbackProvider extends AbstractTreeProvider<NxHelpAndFeedbackTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getParent(_: NxHelpAndFeedbackTreeItem) {
    return null;
  }

  getChildren(): ProviderResult<NxHelpAndFeedbackTreeItem[]> {
    return (
      [
        [
          'Nx Console Documentation',
          'https://nx.dev/core-features/integrate-with-editors#nx-console-for-vscode',
          {
            light: Uri.file(
              join(this.context.extensionPath, 'assets', 'nx-console-light.svg')
            ),
            dark: Uri.file(
              join(this.context.extensionPath, 'assets', 'nx-console-dark.svg')
            ),
          },
        ],
        ['Nx Documentation', 'https://nx.dev/', new ThemeIcon('book')],
        [
          'Report a Bug',
          'https://github.com/nrwl/nx-console/issues/new?labels=type%3A+bug&template=1-bug.md',
          new ThemeIcon('bug'),
        ],
        [
          'Suggest a Feature',
          'https://github.com/nrwl/nx-console/issues/new?labels=type%3A+feature&template=2-feature.md',
          new ThemeIcon('lightbulb'),
        ],
      ] as const
    ).map(
      ([title, link, icon]) => new NxHelpAndFeedbackTreeItem(title, link, icon)
    );
  }
}
