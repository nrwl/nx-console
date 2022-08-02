import { Uri, WebviewPanel, workspace } from 'vscode';
import { MessageType } from './graph-message-type';
import { getProjectGraphOutput } from './create-project-graph';

const html = String.raw;

export function loadNoProject() {
  return html`
    <script>
      const vscodeApi = acquireVsCodeApi();

      function refresh() {
        vscodeApi.postMessage({
          command: 'refresh',
        });
      }
    </script>
    <p>
      Unable to find the selected project in the workspace. Please make sure
      that node_modules is installed and that the Nx projects are loaded
      properly.
    </p>
    <p>
      If node_modules are installed, click
      <a onclick="refresh()" style="cursor: pointer">here</a> to reload the
      projects in the workspace.
    </p>
  `;
}

export function loadError() {
  return html`
    <p>
      Unable to load the project graph. Please check the output for errors and
      try again.
    </p>
  `;
}

export function loadSpinner() {
  return html`
    <style>
      .lds-roller {
        display: inline-block;
        position: relative;
        width: 80px;
        height: 80px;
      }

      .lds-roller div {
        animation: lds-roller 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        transform-origin: 40px 40px;
      }

      .lds-roller div:after {
        content: ' ';
        display: block;
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--vscode-editor-foreground);
        margin: -4px 0 0 -4px;
      }

      .lds-roller div:nth-child(1) {
        animation-delay: -0.036s;
      }

      .lds-roller div:nth-child(1):after {
        top: 63px;
        left: 63px;
      }

      .lds-roller div:nth-child(2) {
        animation-delay: -0.072s;
      }

      .lds-roller div:nth-child(2):after {
        top: 68px;
        left: 56px;
      }

      .lds-roller div:nth-child(3) {
        animation-delay: -0.108s;
      }

      .lds-roller div:nth-child(3):after {
        top: 71px;
        left: 48px;
      }

      .lds-roller div:nth-child(4) {
        animation-delay: -0.144s;
      }

      .lds-roller div:nth-child(4):after {
        top: 72px;
        left: 40px;
      }

      .lds-roller div:nth-child(5) {
        animation-delay: -0.18s;
      }

      .lds-roller div:nth-child(5):after {
        top: 71px;
        left: 32px;
      }

      .lds-roller div:nth-child(6) {
        animation-delay: -0.216s;
      }

      .lds-roller div:nth-child(6):after {
        top: 68px;
        left: 24px;
      }

      .lds-roller div:nth-child(7) {
        animation-delay: -0.252s;
      }

      .lds-roller div:nth-child(7):after {
        top: 63px;
        left: 17px;
      }

      .lds-roller div:nth-child(8) {
        animation-delay: -0.288s;
      }

      .lds-roller div:nth-child(8):after {
        top: 56px;
        left: 12px;
      }

      @keyframes lds-roller {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      main {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
    </style>
    <main>
      <div class="lds-roller">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </main>
  `;
}

export async function loadHtml(panel: WebviewPanel) {
  const projectGraphOutput = getProjectGraphOutput();

  const rootUri = Uri.file(projectGraphOutput.directory);
  const htmlUri = Uri.file(projectGraphOutput.fullPath);
  let projectGraphHtml = (await workspace.fs.readFile(htmlUri)).toString();

  projectGraphHtml = projectGraphHtml.replace(
    /static\//g,
    `${panel.webview.asWebviewUri(rootUri)}/static/`
  );
  projectGraphHtml = projectGraphHtml.replace(
    '</head>',
    html`
      <style>
        #sidebar {
          display: none;
        }

        #no-projects-chosen {
          display: none
        }

        body {
          background-color: var(--vscode-settings-editor-background) !important;
        }
        .nx-select-project {
          padding: 12px;
        }
      </style>
      <script>${injectedScript()}</script>
      </head>`
  );

  return projectGraphHtml;
}

function injectedScript() {
  // language=JavaScript
  return `
(function () {
      const vscode = acquireVsCodeApi();

      const noProjectElement = document.createElement('p');
      noProjectElement.classList.add('nx-select-project');
      noProjectElement.innerText = "Please select or focus a Nx project";

      vscode.postMessage({
        command: 'ready',
      })

      function nx12(data) {
        const projectCheckbox = document.querySelector(\`input[value="\${data.projectName}"]\`);
        if (data.type === "${MessageType.focus}") {
          projectCheckbox.parentElement.parentElement.querySelector('button').click();
        } else if (data.type === "${MessageType.select}") {
          projectCheckbox.click();
        }
      }

      window.addEventListener('message', ({data}) => {
        if (!data) {
          document.body.prepend(noProjectElement);
          return;
        }

        setTimeout(() => {
          try {
            document.body.removeChild(noProjectElement);
          } catch(e) {
            //noop
          }
          const projectElement = document.querySelector(\`[data-project="\${data.projectName}"]\`);

          if (!projectElement) {
            return nx12(data);
          }

          if (data.type === "${MessageType.focus}") {
            projectElement.parentElement.querySelector('button').click();
          } else if (data.type === "${MessageType.select}") {
            projectElement.click();
          }
        })
      })
    }())
  `;
}
