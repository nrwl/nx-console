import type { ComboBox, Select } from '@microsoft/fast-foundation';
import type { SearchBar } from './components/search-bar';
import type { VscodeTextfield } from '@vscode-elements/elements';
declare global {
  interface HTMLElementTagNameMap {
    'search-bar': SearchBar;
    'vscode-combobox': ComboBox;
    'intellij-combobox': ComboBox;
    'intellij-select': Select;
    'vscode-textfield': VscodeTextfield;
  }
}
