import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeDropdown,
  vsCodeOption,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit';
import { vscodeComboboxStyles } from './fields/autocomplete/vscode-autocomplete-styles';
import {
  fastCombobox,
  fastOption,
  provideFASTDesignSystem,
} from '@microsoft/fast-components';
import {
  intellijComboboxStyles,
  intellijOptionStyles,
} from './fields/autocomplete/intellij-autocomplete-styles';

import './fields/checkbox-field';
import './fields/array-field';
import './fields/input-field';
import './fields/multiselect-field';
import './fields/select-field';
import './fields/autocomplete/autocomplete-field';
import './button';
import './field-list';
import './search-bar';
import './banner';
import './icon';
import './field-nav-item';
import './show-more-divider';
import './badge';

provideFASTDesignSystem().register(
  fastCombobox({
    prefix: 'vscode',
    styles: vscodeComboboxStyles,
    indicator: `
		<svg 
			class="select-indicator"
			part="select-indicator"
			width="16" 
			height="16" 
			viewBox="0 0 16 16" 
			xmlns="http://www.w3.org/2000/svg" 
			fill="currentColor"
		>
			<path 
				fill-rule="evenodd" 
				clip-rule="evenodd" 
				d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
			/>
		</svg>
	`,
  }),
  fastCombobox({
    prefix: 'intellij',
    styles: intellijComboboxStyles,
    indicator: `<img
        src="./icons/chevron-down.svg"
        class="h-[1.25rem]"
      ></img>`,
  }),
  fastOption({ prefix: 'intellij', styles: intellijOptionStyles })
);

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeTextField(),
  vsCodeCheckbox(),
  vsCodeDropdown(),
  vsCodeOption()
);
