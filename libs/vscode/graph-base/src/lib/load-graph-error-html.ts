import { NxError } from '@nx-console/shared/types';

export function loadGraphErrorHtml(errors: NxError[]) {
  return /*html*/ `
    <style>
        pre {
          white-space: pre-wrap;
          border-radius: 5px;
          border: 2px solid var(--vscode-editorWidget-border);
          padding: 20px;
        }
      </style>
      <p>Unable to load the project graph. The following error occurred:</p>
      ${errors
        .map(
          (error) => `<pre>${error.message ?? ''} \n ${error.stack ?? ''}</pre>`
        )
        .join('')}
    `;
}
