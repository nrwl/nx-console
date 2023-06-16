export const schema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    { name: 'option1', isRequired: true },
    {
      name: 'select-field',
      items: ['option1', 'option2', 'option3'],
      'x-priority': 'important',
    },
    { name: 'checkbox-option', type: 'boolean' },
    {
      name: 'multiselect-field',
      type: 'array',
      items: ['option1', 'option2', 'option3'],
    },
    { name: 'array-field', type: 'array' },
    { name: 'option2', pattern: '^[a-zA-Z].*$' },
  ],
};
