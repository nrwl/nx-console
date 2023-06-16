import type { TextField, Checkbox, Dropdown } from '@vscode/webview-ui-toolkit';
import type { SearchBar } from './components/search-bar';

declare global {
  interface HTMLElementTagNameMap {
    'vscode-text-field': TextField;
    'vscode-checkbox': Checkbox;
    'vscode-dropdown': Dropdown;
    'search-bar': SearchBar;
  }
}
