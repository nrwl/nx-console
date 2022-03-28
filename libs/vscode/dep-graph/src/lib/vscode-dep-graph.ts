import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { execSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { getShellExecutionForConfig } from '@nx-console/vscode/tasks';
import { join } from 'path';
import {
  ExtensionContext,
  Task,
  tasks,
  TaskScope,
  Uri,
  ViewColumn,
  Webview,
  window,
} from 'vscode';

export async function openDepGraph(lib?: string) {
  const html = await createDepGraphHtml();
  const webviewPanel = window.createWebviewPanel(
    'nx-console-dep-graph',
    'Nx Dep Graph',
    ViewColumn.Active,
    {
      retainContextWhenHidden: true,
      enableScripts: true,
      localResourceRoots: [
        Uri.joinPath(
          Uri.file(
            WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '')
          ),
          '.temp'
        ),
      ],
    }
  );
  console.log('original');
  console.log(html);
  console.log('adjusted');
  console.log(adjustImports(html, webviewPanel.webview));
  webviewPanel.webview.html = adjustImports(html, webviewPanel.webview);
  // webviewPanel.webview.html = html;
}

const TEMP_FILE_LOCATION = join('.', '.temp', 'dep-graph.html');

async function createDepGraphHtml() {
  // execSync(`npx nx dep-graph --file=${TEMP_FILE_LOCATION}`);
  const cwd = WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '');
  await tasks.executeTask(
    new Task(
      { type: 'nx' },
      TaskScope.Workspace,
      'dep-graph',
      'nx',
      getShellExecutionForConfig({
        cwd,
        displayCommand: `nx dep-graph --file=${TEMP_FILE_LOCATION}`,
      })
    )
  );
  const newContents = (
    await readFile(join(cwd, TEMP_FILE_LOCATION))
  ).toString();
  // await writeFile(join(cwd, TEMP_FILE_LOCATION), adjustImports(newContents));
  return newContents;
}

function adjustImports(html: string, webview: Webview): string {
  const workspaceRootUri = Uri.file(
    WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '')
  );
  const createReplacement = (toReplace: string) =>
    webview.asWebviewUri(
      Uri.joinPath(workspaceRootUri, '.temp', ...toReplace.split('/'))
    );
  const replaceTokens = [
    'static/environment.js',
    'static/styles.css',
    'static/runtime.esm.js',
    'static/polyfills.esm.js',
    'static/main.esm.js',
  ];

  const replaceMap = replaceTokens.reduce((map, token) => {
    map[token] = createReplacement(token);
    return map;
  }, {} as Record<string, Uri>);
  let curr = html;
  for (const token of replaceTokens) {
    curr = curr.replace(
      token,
      webview.asWebviewUri(replaceMap[token]).toString()
    );
  }
  return curr;
}
