import { clickShowMore, getFieldByName } from '../support/get-elements';
import { schema } from '../support/test-schema';
import { visitGenerateUi } from '../support/visit-generate-ui';

describe('multiselect field', () => {
  beforeEach(() => visitGenerateUi(schema));

  it('should add and remove values by clicking', () => {
    const fieldName = 'multiselect-field';
    clickShowMore();
    const field = getFieldByName(fieldName);

    field.select('option1');
    field.select('option2');

    cy.get(`[data-cy="${fieldName}-field-item"]`).as('items');
    cy.get('@items').should('have.length', 2);

    cy.get(`[data-cy="${fieldName}-field-remove-button"]`).as('removeButtons');
    cy.get('@removeButtons').should('have.length', 2);
    cy.get('@removeButtons').first().click();
    cy.get('@removeButtons').first().click();

    cy.get('@items').should('have.length', 0);
  });

  it('should add and remove values with keyboard', () => {
    const fieldName = 'multiselect-field';
    clickShowMore();
    const field = getFieldByName(fieldName);

    // navigating with keydown doesnt work in cypress?
    field.select('option1');
    field.select('option2');

    cy.get(`[data-cy="${fieldName}-field-item"]`).as('items');
    cy.get('@items').should('have.length', 2);

    cy.get('@items').first().focus().type('{enter}');
    cy.get('@items').first().focus().type('{enter}');

    cy.get('@items').should('have.length', 0);
  });
});
