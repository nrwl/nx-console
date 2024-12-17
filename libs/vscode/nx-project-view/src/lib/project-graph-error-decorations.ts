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

export class ProjectGraphErrorDecorationProvider
  implements FileDecorationProvider
{
  provideFileDecoration(uri: Uri): ProviderResult<FileDecoration> {
    if (uri.scheme === PROJECT_GRAPH_ERROR_DECORATION_SCHEME) {
      const errorCount = uri.path;
      return {
        badge: errorCount,
        tooltip: 'Project Graph Error',
        propagate: false,
        color: new ThemeColor('errorForeground'),
      };
    }
  }

  static register(context: ExtensionContext) {
    context.subscriptions.push(
      window.registerFileDecorationProvider(
        new ProjectGraphErrorDecorationProvider()
      ),
      commands.registerCommand('nxConsole.showProblems', () => {
        commands.executeCommand('workbench.actions.view.problems');
      })
    );
  }
}
