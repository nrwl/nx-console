import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { visitGenerateUi } from '../support/visit-generate-ui';

export const schema: GeneratorSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    { name: 'option1', isRequired: true, aliases: [], 'x-hint': 'hint' },
    { name: 'option2', isRequired: false, aliases: [] },
  ],
};

describe('field wrapper', () => {
  beforeEach(() => visitGenerateUi(schema));

  it('should show hint if x-hint is set', () => {
    cy.get('field-list popover-element').click();
    cy.get('[data-cy="popover-content"]').should('be.visible');
    cy.get('[data-cy="popover-content"]').should('contain.text', 'hint');
  });
});
