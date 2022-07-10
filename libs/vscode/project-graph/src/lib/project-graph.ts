import { findProjectWithPath } from '@nx-console/vscode/nx-workspace';
import { commands, Disposable, Uri } from 'vscode';
import { generateProjectGraph } from './project-graph-process';
import { focusProjectInWebview, webview } from './project-graph-webview';

export function projectGraph() {
  return Disposable.from(
    commands.registerCommand('nx.project-graph', async () => {
      generateProjectGraph();
      await webview();
    }),
    commands.registerCommand('nx.project-graph.focus', async (uri: Uri) => {
      const project = await findProjectWithPath(uri.fsPath);
      focusProjectInWebview(project);
      console.log(project);
    })
  );
}
