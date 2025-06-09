import {
  fastCombobox,
  fastOption,
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

provideFASTDesignSystem().register(
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
