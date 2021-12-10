import { OptionType } from '@angular/cli/models/interface';
import { FieldItemsPipe, getOptionItems } from './field-items.pipe';

describe('FieldItemsPipe', () => {
  it('create an instance', () => {
    const pipe = new FieldItemsPipe();
    expect(pipe).toBeTruthy();
  });

  it('should get option items', () => {
    const field1 = {
      name: 'style',
      type: OptionType.String,
      aliases: [],
      description: 'The file extension to be used for style files.',
      isRequired: false,
      default: 'scss',
      items: {
        type: OptionType.String,
        enum: ['css', 'scss', 'styl', 'less'],
      },
    };
    expect(getOptionItems(field1)).toEqual(field1.items.enum);

    const field2 = {
      name: 'style',
      type: OptionType.String,
      isRequired: false,
      aliases: [],
      description: 'The file extension to be used for style files.',
      default: 'scss',
      items: ['css', 'scss', 'styl', 'less'],
    };
    expect(getOptionItems(field2)).toEqual(field2.items);
  });
});
