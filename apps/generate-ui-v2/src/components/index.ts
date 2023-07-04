import './fields/checkbox-field';
import './fields/array-field';
import './fields/input-field';
import './fields/multiselect-field';
import './fields/select-field';
import './fields/autocomplete-field';
import './button';
import './field-list';
import './search-bar';
import './banner';
import './icon';
import './field-nav-item';
import './show-more-divider';
import './badge';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeDropdown,
  vsCodeOption,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeTextField(),
  vsCodeCheckbox(),
  vsCodeDropdown(),
  vsCodeOption()
);
