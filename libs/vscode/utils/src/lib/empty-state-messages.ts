import { window } from 'vscode';

export function showNoProjectsMessage() {
  window.showWarningMessage(
    'No projects found. Did you run npm/pnpm/yarn install?'
  );
}

export function showNoGeneratorsMessage() {
  window.showWarningMessage(
    'No generators found. Did you run npm/pnpm/yarn install?'
  );
}
