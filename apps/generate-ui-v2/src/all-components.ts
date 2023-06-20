import './components/fields/checkbox-field';
import './components/fields/array-field';
import './components/fields/input-field';
import './components/fields/multiselect-field';
import './components/fields/select-field';
import './components/button';
import './components/field-list';
import './components/search-bar';
import './components/banner';
import './components/icon';
import './components/field-nav-item';
import './components/show-more-divider';
import '@nx-console/shared/lit-utils';
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
