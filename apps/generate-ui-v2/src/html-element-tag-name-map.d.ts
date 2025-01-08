import type { ComboBox } from '@microsoft/fast-foundation';
import type { SearchBar } from './components/search-bar';
import type { VscodeTextfield } from '@vscode-elements/elements';
declare global {
  interface HTMLElementTagNameMap {
    'search-bar': SearchBar;
    'vscode-combobox': ComboBox;
    'intellij-combobox': ComboBox;
    'vscode-textfield': VscodeTextfield;
  }
}
