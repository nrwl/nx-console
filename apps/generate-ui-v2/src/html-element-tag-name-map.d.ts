import type { TextField, Checkbox, Dropdown } from '@vscode/webview-ui-toolkit';
import type { ComboBox } from '@microsoft/fast-foundation';
import type { SearchBar } from './components/search-bar';

declare global {
  interface HTMLElementTagNameMap {
    'vscode-text-field': TextField;
    'vscode-checkbox': Checkbox;
    'vscode-dropdown': Dropdown;
    'search-bar': SearchBar;
    'vscode-combobox': ComboBox;
  }
}
