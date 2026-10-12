import {
  fastCombobox,
  fastOption,
  fastSelect,
  provideFASTDesignSystem,
} from '@microsoft/fast-components';
import {
  intellijComboboxStyles,
  intellijOptionStyles,
} from './fields/autocomplete/intellij-autocomplete-styles';

// Import shared components
import '@nx-console/shared-ui-components';

import './fields/checkbox-field';
import './fields/array-field';
import './fields/input-field';
import './fields/multiselect-field';
import './fields/select-field';
import './fields/autocomplete/autocomplete-field';
import './cwd-breadcrumb';
import './field-list';
import './search-bar';
import './field-nav-item';
import './show-more-divider';
import './popover';

const intellijIndicator = `<img
    src="./icons/chevron-down.svg"
    class="h-[1.25rem]"
  ></img>`;

// JCEF renders a native <select> popup off-screen and crops it to the browser,
// so options near the bottom of the form are cut off. These list in the page
// instead and open upwards when there is no room below.
provideFASTDesignSystem().register(
  fastCombobox({
    prefix: 'intellij',
    styles: intellijComboboxStyles,
    indicator: intellijIndicator,
  }),
  fastSelect({
    prefix: 'intellij',
    styles: intellijComboboxStyles,
    indicator: intellijIndicator,
  }),
  fastOption({ prefix: 'intellij', styles: intellijOptionStyles }),
);
