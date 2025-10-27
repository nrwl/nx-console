import {
  commands,
  ExtensionContext,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  ThemeColor,
  Uri,
  window,
} from 'vscode';

export const PROJECT_GRAPH_ERROR_DECORATION_SCHEME = 'nx-project-graph-error';
export const NX_DAEMON_DISABLED_DECORATION_SCHEME = 'nx-daemon-disabled';

export class ProjectGraphErrorDecorationProvider
  implements FileDecorationProvider
{
  provideFileDecoration(uri: Uri): ProviderResult<FileDecoration> {
    if (uri.scheme === PROJECT_GRAPH_ERROR_DECORATION_SCHEME) {
      const errorCount = uri.path;
      return {
        badge: errorCount,
        propagate: false,
        color: new ThemeColor('errorForeground'),
      };
    } else if (uri.scheme === NX_DAEMON_DISABLED_DECORATION_SCHEME) {
      return {
        tooltip:
          'Nx Daemon is disabled. Some features may be unavailable. Click to learn more.',
        color: new ThemeColor('warningForeground'),
      };
    }
  }

  static register(context: ExtensionContext) {
    context.subscriptions.push(
      window.registerFileDecorationProvider(
        new ProjectGraphErrorDecorationProvider(),
      ),
      commands.registerCommand('nxConsole.showProblems', () => {
        commands.executeCommand('workbench.actions.view.problems');
      }),
    );
  }
}
