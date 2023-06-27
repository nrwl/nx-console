import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

export const schema: GeneratorSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    { name: 'option1', isRequired: true, aliases: [] },
    {
      name: 'select-field',
      items: ['option1', 'option2', 'option3'],
      'x-priority': 'important',
      aliases: [],
      isRequired: false,
    },
    { name: 'checkbox-field', type: 'boolean', aliases: [], isRequired: false },
    {
      name: 'multiselect-field',
      type: 'array',
      items: ['option1', 'option2', 'option3'],
      aliases: [],
      isRequired: false,
    },
    { name: 'array-field', type: 'array', aliases: [], isRequired: false },
    {
      name: 'option2',
      pattern: '^[a-zA-Z].*$',
      aliases: [],
      isRequired: false,
    },
  ],
};
