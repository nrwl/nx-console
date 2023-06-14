import { schema } from '../test-schema.mjs';

describe('generate-ui-v2', () => {
  beforeEach(() => cy.visit('/'));

  it('should display header', () => {
    cy.get("[data-cy='header-text']").should(
      'contain.text',
      `nx generate ${schema.collectionName}:${schema.generatorName}`
    );
  });
});
