import type { TextField, Checkbox, Dropdown } from '@vscode/webview-ui-toolkit';

declare global {
  interface HTMLElementTagNameMap {
    'vscode-text-field': TextField;
    'vscode-checkbox': Checkbox;
    'vscode-dropdown': Dropdown;
  }
}
