import { normalizeSchema } from './utils';
import { OptionType } from '@angular/cli/models/interface';
import { OptionComponent, LongFormXPrompt, Option } from '@nx-console/schema';

describe('utils', () => {
  describe('normalizeSchema', () => {
    const mockOption: any = {
      name: 'style',
      description: 'The file extension to be used for style files.',
      type: OptionType.String,
      aliases: []
    };
    const getSchema = async (
      options: any[],
      required: string[] = []
    ): Promise<Option[]> => {
      const r = await normalizeSchema({
        properties: { ...options },
        required
      });
      return r;
    };

    it('should mark fields as required if they are listed in the required array', async () => {
      const r = await getSchema([mockOption], ['0']);
      expect(r[0].required).toBeTruthy();
    });

    it('should not mark fields as required otherwise', async () => {
      const r = await getSchema([mockOption]);
      expect(r[0].required).toBeFalsy();
    });

    it('should sort positional arguments by ascending order', async () => {
      const r = await normalizeSchema({
        properties: {
          a: { $default: { $source: 'argv', index: 0 } },
          b: { $default: { $source: 'argv', index: 2 } },
          c: { $default: { $source: 'argv', index: 1 } }
        },
        required: []
      });
      expect(r.map(x => x.name)).toEqual(['a', 'c', 'b']);
    });

    it('should set items when enum is provided', async () => {
      const option = {
        ...mockOption,
        enum: ['test']
      };
      const r = await getSchema([option]);
      expect(r[0].items).toEqual(['test']);
    });

    describe('fieldType', () => {
      it('should set field type as Autocomplete when number of enum options is greater than 10', async () => {
        const option = {
          ...mockOption,
          enum: [...Array(11).keys()]
        };
        const r = await getSchema([option]);
        expect(r[0].component).toBe(OptionComponent.Autocomplete);
      });
      it('should set field type as Select when number of enum options is less than or equal to 10', async () => {
        const option = {
          ...mockOption,
          enum: [...Array(10).keys()]
        };
        const r = await getSchema([option]);
        expect(r[0].component).toBe(OptionComponent.Select);
      });
      it('should set field type as MultiSelect when x-prompt has options and multi is true', async () => {
        const xPrompt: LongFormXPrompt = {
          message: '',
          type: 'list',
          multiselect: true
        };
        const option = {
          ...mockOption,
          'x-prompt': xPrompt
        };
        const r = await getSchema([option]);
        expect(r[0].component).toBe(OptionComponent.MultiSelect);
      });
      it('should set field type as Select when x-prompt has long form options', async () => {
        const xPrompt: LongFormXPrompt = {
          message: 'This is the x-prompt message',
          type: 'list',
          items: [
            {
              value: 'css',
              label: 'CSS'
            },
            {
              value: 'scss',
              label: 'SASS(.scss)  [ http://sass-lang.com   ]'
            },
            {
              value: 'styl',
              label: 'Stylus(.styl)[ http://stylus-lang.com ]'
            },
            {
              value: 'less',
              label: 'LESS         [ http://lesscss.org     ]'
            }
          ]
        };
        const option = {
          ...mockOption,
          'x-prompt': xPrompt
        };
        const r = await getSchema([option]);
        expect(r[0].component).toBe(OptionComponent.Select);
      });
      it('should set field type as Checkbox when option type is boolean', async () => {
        const option = {
          ...mockOption,
          type: OptionType.Boolean
        };
        const r = await getSchema([option]);
        expect(r[0].component).toBe(OptionComponent.Checkbox);
      });
      it('should set field type as Input when option has no enum and type is not boolean', async () => {
        const r = await getSchema([mockOption]);
        expect(r[0].component).toBe(OptionComponent.Input);
      });
    });

    describe('xPrompt', () => {
      const xPromptItems = [
        { value: 'css', label: 'CSS' },
        {
          value: 'scss',
          label: 'SASS(.scss) [http://sass-lang.com]'
        },
        {
          value: 'less',
          label: 'LESS        [http://lesscss.org]'
        }
      ];
      it('should set tooltip when option has short form xPrompt', async () => {
        const xPromptMessage = 'test';
        const option = {
          ...mockOption,
          'x-prompt': xPromptMessage
        };
        const r = await getSchema([option]);
        expect(r[0].tooltip).toBe(xPromptMessage);
      });

      it('should set tooltip when option has long form xPrompt', async () => {
        const xPrompt: LongFormXPrompt = {
          message: 'test',
          type: 'confirmation'
        };
        const option = {
          ...mockOption,
          enum: [...Array(11).keys()],
          'x-prompt': xPrompt
        };
        const r = await getSchema([option]);
        expect(r[0].tooltip).toBe(xPrompt.message);
      });

      it('should set enumTooltips when x-prompt has items and labels', async () => {
        const option = {
          ...mockOption,
          'x-prompt': {
            message: 'Which stylesheet format would you like to use?',
            type: 'list',
            items: xPromptItems
          }
        };
        const r = await getSchema([option]);
        expect(r[0].itemTooltips).toEqual({
          css: xPromptItems[0].label,
          scss: xPromptItems[1].label,
          less: xPromptItems[2].label
        });
      });
      it('should set items from xPrompt items with label and value when enum is not provided', async () => {
        const option = {
          ...mockOption,
          'x-prompt': {
            message: 'Which stylesheet format would you like to use?',
            type: 'list',
            items: xPromptItems
          }
        };
        const r = await getSchema([option]);
        expect(r[0].items).toEqual([
          xPromptItems[0].value,
          xPromptItems[1].value,
          xPromptItems[2].value
        ]);
      });
      it('should set items from xPrompt string items when enum is not provided', async () => {
        const option = {
          ...mockOption,
          'x-prompt': {
            message: 'Which stylesheet format would you like to use?',
            type: 'list',
            items: ['test']
          }
        };
        const r = await getSchema([option]);
        expect(r[0].items).toEqual(['test']);
      });
    });
  });
});
