import { clickShowMore, getFieldByName } from '../support/get-elements';

describe('array field', () => {
  beforeEach(() => cy.visit('/'));
  it('should add and remove values by clicking', () => {
    const fieldName = 'array-field';
    clickShowMore();
    const field = getFieldByName(fieldName);
    cy.get(`[data-cy="${fieldName}-field-add-button"]`).as('addButton');

    field.type('test');
    cy.get('@addButton').click();
    field.type('test2');
    cy.get('@addButton').click();

    cy.get(`[data-cy="${fieldName}-field-item"]`).as('items');
    cy.get('@items').should('have.length', 2);

    cy.get(`[data-cy="${fieldName}-field-remove-button"]`).as('removeButtons');
    cy.get('@removeButtons').should('have.length', 2);
    cy.get('@removeButtons').first().click();
    cy.get('@removeButtons').first().click();

    cy.get('@items').should('have.length', 0);
  });

  it('should add and remove values with keyboard', () => {
    const fieldName = 'array-field';
    clickShowMore();
    const field = getFieldByName(fieldName);

    field.focus().type('test{enter}');
    field.focus().type('test2{enter}');

    cy.get(`[data-cy="${fieldName}-field-item"]`).as('items');
    cy.get('@items').should('have.length', 2);

    cy.get('@items').first().focus().type('{enter}');
    cy.get('@items').first().focus().type('{enter}');

    cy.get('@items').should('have.length', 0);
  });
});
