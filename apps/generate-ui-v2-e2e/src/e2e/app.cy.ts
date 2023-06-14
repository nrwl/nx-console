import { schema } from '../test-schema.mjs';
import { getFields } from '../support/get-fields';

describe('generate-ui-v2', () => {
  beforeEach(() => cy.visit('/'));

  it('should display header', () => {
    cy.get("[data-cy='header-text']").should(
      'contain.text',
      `nx generate ${schema.collectionName}:${schema.generatorName}`
    );
  });

  describe('field list', () => {
    it('should show only important fields by default', () => {
      getFields().should('have.length', 1);
    });
    it('should show all fields when show all is clicked', () => {
      cy.get('[data-cy="show-more"]').click();
      getFields().should('have.length', 2);
    });
  });
});
