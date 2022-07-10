import { Uri, WebviewPanel, workspace } from 'vscode';
import { MessageType } from './graph-message-type';
import { getProjectGraphOutput } from './project-graph-process';

export async function loadHtml(panel: WebviewPanel) {
  const projectGraphOutput = getProjectGraphOutput();

  const rootUri = Uri.file(projectGraphOutput.directory);
  const htmlUri = Uri.file(projectGraphOutput.fullPath);
  let html = (await workspace.fs.readFile(htmlUri)).toString();

  html = html.replace(
    /static\//g,
    `${panel.webview.asWebviewUri(rootUri)}/static/`
  );
  html = html.replace('</head>', `<script>${injectedScript()}</script></head>`);

  return html;
}

function injectedScript() {
  // language=JavaScript
  return `
  window.addEventListener('message', ({data}) => {
    console.log('incoming message', data);
    const projectElement = document.querySelector(\`[data-project="\${data.projectName}"]\`);
    if(data.type === "${MessageType.focus}") {
      projectElement.parentElement.querySelector('button').click();
    } else if (data.type === "${MessageType.select}") {
      projectElement.click();
    }
  })
  `;
}
