import { OptionType } from '@angular/cli/models/interface';
import { Option } from '@nx-console/schema';
import { MultipleSelectComponent } from './multiple-select.component';

describe('MultipleSelectComponent', () => {
  let component: MultipleSelectComponent;
  const mockOption: Option = {
    name: 'style',
    description: 'The file extension to be used for style files.',
    type: OptionType.String,
    aliases: [],
    itemTooltips: {
      test: 'testLabel',
    },
  };
  beforeEach(() => {
    component = new MultipleSelectComponent();
  });

  describe('getOptionTooltip', () => {
    it('should get tooltip for option value', () => {
      component.field = mockOption;
      expect(component.getOptionTooltip('test')).toBe('testLabel');
    });
    it('should return null when there is no tooltip for option value', () => {
      component.field = mockOption;
      expect(component.getOptionTooltip('noTooltipValue')).toBeNull();
    });
  });
});
