import type { Schema } from 'nx/src/utils/params';
import {
  LongFormXPrompt,
  OptionPropertyDescription,
  OptionType,
  Option,
} from './index';
import { normalizeSchema } from './normalize-schema';

describe('utils', () => {
  describe('normalizeSchema', () => {
    const mockOption: OptionPropertyDescription = {
      description: 'The file extension to be used for style files.',
      type: OptionType.String,
    };
    const getSchema = async (
      options: Schema['properties'],
      required: string[] = []
    ): Promise<Option[]> => {
      const r = await normalizeSchema({
        properties: { ...options },
        required,
      });
      return r;
    };

    it('should work with schema without any properties', async () => {
      // @ts-expect-error absence of required property "properties" is needed to test failure resistance
      const r = await normalizeSchema({});
      expect(r).toEqual([]);
    });

    it('should mark fields as required if they are listed in the required array', async () => {
      const r = await getSchema({ mockOption }, ['mockOption']);
      expect(r[0].isRequired).toBeTruthy();
    });

    it('should not mark fields as required otherwise', async () => {
      const r = await getSchema({ mockOption });
      expect(r[0].isRequired).toBeFalsy();
    });

    it('should sort arguments', async () => {
      const r = await normalizeSchema({
        properties: {
          a: { 'x-priority': 'internal' },
          b: { 'x-priority': 'important' },
          c: { 'x-deprecated': 'good reason' },
          d: {},
          e: {},
        } as Schema['properties'],
        required: ['e'],
      });
      expect(r.map((x) => x.name)).toMatchInlineSnapshot(`
        Array [
          "e",
          "b",
          "d",
          "a",
          "c",
        ]
      `);
    });

    it('should set items when enum is provided', async () => {
      const option = {
        ...mockOption,
        enum: ['test'],
      };
      const r = await getSchema({ option });
      expect(r[0].items).toEqual(['test']);
    });

    describe('xPrompt', () => {
      const xPromptItems = [
        { value: 'css', label: 'CSS' },
        {
          value: 'scss',
          label: 'SASS(.scss) [http://sass-lang.com]',
        },
        {
          value: 'less',
          label: 'LESS        [http://lesscss.org]',
        },
      ];
      it('should set tooltip when option has short form xPrompt', async () => {
        const xPromptMessage = 'test';
        const option = {
          ...mockOption,
          'x-prompt': xPromptMessage,
        };
        const r = await getSchema({ option });
        expect(r[0].tooltip).toBe(xPromptMessage);
      });

      it('should set tooltip when option has long form xPrompt', async () => {
        const xPrompt: LongFormXPrompt = {
          message: 'test',
          type: 'confirmation',
        };
        const option: OptionPropertyDescription = {
          ...mockOption,
          enum: [...Array(11).keys()].map((i) => i.toString()),
          'x-prompt': xPrompt as any,
        };
        const r = await getSchema({ option });
        expect(r[0].tooltip).toBe(xPrompt.message);
      });

      it('should set enumTooltips when x-prompt has items and labels', async () => {
        const option = {
          ...mockOption,
          'x-prompt': {
            message: 'Which stylesheet format would you like to use?',
            type: 'list',
            items: xPromptItems,
          },
        };
        const r = await getSchema({ option });
        expect(r[0].itemTooltips).toEqual({
          css: xPromptItems[0].label,
          scss: xPromptItems[1].label,
          less: xPromptItems[2].label,
        });
      });
      it('should set items from xPrompt items with label and value when enum is not provided', async () => {
        const option = {
          ...mockOption,
          'x-prompt': {
            message: 'Which stylesheet format would you like to use?',
            type: 'list',
            items: xPromptItems,
          },
        };
        const r = await getSchema({ option });
        expect(r[0].items).toEqual([
          xPromptItems[0].value,
          xPromptItems[1].value,
          xPromptItems[2].value,
        ]);
      });
      it('should set items from xPrompt string items when enum is not provided', async () => {
        const option = {
          ...mockOption,
          'x-prompt': {
            message: 'Which stylesheet format would you like to use?',
            type: 'list',
            items: ['test'],
          },
        };
        const r = await getSchema({ option });
        expect(r[0].items).toEqual(['test']);
      });
    });
  });
});
