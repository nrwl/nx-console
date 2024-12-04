import { commands, window } from 'vscode';

export function showNoProjectsMessage(workspaceIsDefined = false) {
  if (workspaceIsDefined) {
    window
      .showWarningMessage(
        `No projects found. Click to refresh workspace.`,
        'Refresh',
        'OK'
      )
      .then((selection) => {
        if (selection === 'Refresh') {
          commands.executeCommand('nxConsole.refreshWorkspace');
        }
      });
  } else {
    window.showWarningMessage(
      `No projects found. Did you run npm/pnpm/yarn install?`
    );
  }
}

export function showNoTargetsMessage(workspaceIsDefined = false) {
  if (workspaceIsDefined) {
    window
      .showWarningMessage(
        `No targets found. Click to refresh workspace.`,
        'Refresh',
        'OK'
      )
      .then((selection) => {
        if (selection === 'Refresh') {
          commands.executeCommand('nxConsole.refreshWorkspace');
        }
      });
  } else {
    window.showWarningMessage(
      `No projects found. Did you run npm/pnpm/yarn install?`
    );
  }
}

export function showNoProjectAtPathMessage(path: string) {
  window.showWarningMessage(
    `No project found at ${path}. Did you run npm/pnpm/yarn install?`
  );
}

export function showNoGeneratorsMessage() {
  window.showWarningMessage(
    'No generators found. Did you run npm/pnpm/yarn install?'
  );
}
