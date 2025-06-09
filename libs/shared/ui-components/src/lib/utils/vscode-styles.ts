import { css } from 'lit';

export function getVscodeStyleMappings() {
  // note that --vscode-settings-dropdownListBorder is the color used for the webview ui toolkit divider
  // refer to https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/src/design-tokens.ts
  return css`
    host: {
      --foreground-color: var(--vscode-editor-foreground);
      --muted-foreground-color: var(--vscode-input-placeholderForeground);
      --background-color: var(--vscode-editor-background);
      --primary-color: var(
        --button-primary-background,
        var(--vscode-button-background)
      );
      --secondary-color: var(--button-secondary-background);
      --error-color: var(--vscode-inputValidation-errorBorder);
      --field-border-color: var(--panel-view-border);
      --focus-border-color: var(--vscode-focusBorder);
      --badge-background-color: var(--vscode-badge-background);
      --badge-foreground-color: var(--vscode-badge-foreground);
      --banner-warning-color: var(--vscode-statusBarItem-warningBackground);
      --banner-error-color: var(--vscode-statusBarItem-errorBackground);
      --banner-text-color: var(--vscode-statusBarItem-warningForeground);
      --separator-color: var(--vscode-settings-dropdownListBorder);
      --field-nav-hover-color: var(--vscode-list-hoverBackground);
    }
  `;
}
