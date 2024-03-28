import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { join } from 'path';
import { ExtensionContext, ThemeIcon, TreeItem, Uri } from 'vscode';
import { NxHelpAndFeedbackTreeItem } from './nx-help-and-feedback-tree-item';

export class NxHelpAndFeedbackProvider extends AbstractTreeProvider<NxHelpAndFeedbackTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
  }

  getParent(_: NxHelpAndFeedbackTreeItem | TreeItem) {
    return null;
  }

  async getChildren(): Promise<NxHelpAndFeedbackTreeItem[] | null | undefined> {
    return this.getInfoItems();
  }

  getInfoItems() {
    return (
      [
        [
          'Nx Console Documentation',
          'https://nx.dev/core-features/integrate-with-editors#nx-console-for-vscode?utm_source=nxconsole',
          {
            light: Uri.file(
              join(this.context.extensionPath, 'assets', 'nx-console-light.svg')
            ),
            dark: Uri.file(
              join(this.context.extensionPath, 'assets', 'nx-console-dark.svg')
            ),
          },
        ],
        [
          'Nx Documentation',
          'https://nx.dev?utm_source=nxconsole',
          new ThemeIcon('book'),
        ],
        [
          'Report a Bug for Nx',
          'https://github.com/nrwl/nx/issues/new?labels=type%3A+bug&template=1-bug.yml',
          new ThemeIcon('bug'),
        ],
        [
          'Report a Bug for Nx Console',
          'https://github.com/nrwl/nx-console/issues/new?labels=type%3A+bug&template=1-bug.md',
          new ThemeIcon('bug'),
        ],
        [
          'Suggest a Feature',
          'https://github.com/nrwl/nx-console/issues/new?labels=type%3A+feature&template=2-feature.md',
          new ThemeIcon('lightbulb'),
        ],
        [
          'Nx Console Troubleshooting Guide',
          'https://nx.dev/recipes/nx-console/console-troubleshooting?utm_source=nxconsole',
          new ThemeIcon('tools'),
        ],
        [
          'Nx Troubleshooting Guide',
          'https://nx.dev/recipes/troubleshooting/troubleshoot-nx-install-issues?utm_source=nxconsole',
          new ThemeIcon('tools'),
        ],
      ] as const
    ).map(
      ([title, link, icon]) => new NxHelpAndFeedbackTreeItem(title, link, icon)
    );
  }
}
