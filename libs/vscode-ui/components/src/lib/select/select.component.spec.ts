import { OptionType } from '@angular/cli/models/interface';
import { Option, OptionComponent } from '@nx-console/schema';
import { SelectComponent } from './select.component';

describe('SelectComponent', () => {
  let component: SelectComponent;
  const mockOption: Option = {
    name: 'style',
    description: 'The file extension to be used for style files.',
    type: OptionType.String,
    component: OptionComponent.Select,
    aliases: [],
    itemTooltips: {
      test: 'testLabel'
    }
  };
  beforeEach(() => {
    component = new SelectComponent();
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
