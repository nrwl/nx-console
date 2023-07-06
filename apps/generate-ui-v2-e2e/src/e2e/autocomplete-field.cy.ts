import { getFieldByName, getFields } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';

const autocompleteSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    {
      name: 'option1',
      isRequired: true,
      items: ['only1', 'only2', 'only3'],
      aliases: [],
    },
    {
      name: 'option2',
      isRequired: true,
      items: [
        'item1',
        'item2',
        'item3',
        'item4',
        'item5',
        'item6',
        'item7',
        'item8',
        'item9',
        'item10',
        'item11',
        'item12',
      ],
      aliases: [],
    },
  ],
};
describe('autocomplete field', () => {
  beforeEach(() => visitGenerateUi(autocompleteSchema));

  it('should correctly render select & autocomplete fields based on item length', () => {
    getFields().then((fields) => {
      const tagNames = fields
        .map((_, field) => field.tagName.toLowerCase())
        .get();
      expect(tagNames).to.deep.eq(['select-field', 'autocomplete-field']);
    });
  });

  it('should correctly render all options when expanded', () => {
    getFieldByName('option2').click();
    cy.get('intellij-option').should('have.length', 12);
  });
});
