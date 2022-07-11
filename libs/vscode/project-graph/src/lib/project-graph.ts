import { findProjectWithPath } from '@nx-console/vscode/nx-workspace';
import { commands, Disposable, Uri } from 'vscode';
import { MessageType } from './graph-message-type';
import { generateProjectGraph } from './graph-process';
import { projectInWebview, webview } from './graph-webview';

export function projectGraph() {
  return Disposable.from(
    commands.registerCommand('nx.graph', async () => {
      generateProjectGraph();
      await webview();
    }),
    commands.registerCommand('nx.graph.focus', async (uri: Uri) => {
      const project = await findProjectWithPath(uri.fsPath);
      projectInWebview(project?.name, MessageType.focus);
    }),
    commands.registerCommand('nx.graph.select', async (uri: Uri) => {
      const project = await findProjectWithPath(uri.fsPath);
      projectInWebview(project?.name, MessageType.select);
    }),
    commands.registerCommand(
      'nx.graph.focus.button',
      async ({
        nxProject: { project: projectName },
      }: {
        nxProject: { project: string };
      }) => {
        projectInWebview(projectName, MessageType.focus);
      }
    ),
    commands.registerCommand(
      'nx.graph.select.button',
      async ({
        nxProject: { project: projectName },
      }: {
        nxProject: { project: string };
      }) => {
        projectInWebview(projectName, MessageType.select);
      }
    )
  );
}
