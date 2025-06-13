import type { Preview } from '@storybook/web-components';
import { html } from 'lit';

// Import and register shared UI components
import '@nx-console/shared-ui-components';
import '@vscode/codicons/dist/codicon.css';
// import '../src/tailwind.css';
import '@vscode-elements/elements/dist/bundled.js';

// Add VSCode theme CSS variables
const vsCodeThemeDecorator = (story: any) => {
  return html`
    <style>
      :root {
        /* VSCode Light Theme Variables */
        --vscode-editor-foreground: #333333;
        --vscode-editor-background: #ffffff;
        --vscode-panel-border: #e5e5e5;
        --vscode-list-hoverBackground: #e8e8e8;
        --vscode-testing-iconPassed: #388a34;
        --vscode-errorForeground: #e51400;
        --vscode-editorWarning-foreground: #bf8803;
        --vscode-badge-background: #c5c5c5;
        --vscode-badge-foreground: #333333;
        --vscode-button-background: #007acc;
        --vscode-button-hoverBackground: #0062a3;
        --vscode-button-secondaryBackground: #5f6a7a;
        --vscode-textLink-foreground: #0066bf;
        --vscode-textLink-activeForeground: #0066bf;
        --vscode-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        --vscode-font-size: 13px;
        --vscode-editor-font-family:
          'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas,
          'Courier New', monospace;
        --vscode-editor-font-size: 12px;
        --vscode-editorInfo-background: rgba(0, 100, 200, 0.05);
        --vscode-editorInfo-border: rgba(0, 100, 200, 0.15);
      }

      body {
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
      }
    </style>
    ${story()}
  `;
};

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'vscode-light',
      values: [
        {
          name: 'vscode-light',
          value: '#ffffff',
        },
        {
          name: 'vscode-dark',
          value: '#1e1e1e',
        },
      ],
    },
  },
  decorators: [vsCodeThemeDecorator],
};

export default preview;
