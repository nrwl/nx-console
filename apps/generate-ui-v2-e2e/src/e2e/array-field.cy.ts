import { clickShowMore, getFieldByName } from '../support/get-elements';

describe('array field', () => {
  beforeEach(() => cy.visit('/'));
  it('should add and remove values by clicking', () => {
    const fieldName = 'array-field';
    clickShowMore();
    const field = getFieldByName(fieldName);
    const addButton = cy.get(`[data-cy="${fieldName}-field-add-button"]`);

    field.type('test');
    addButton.click();
    field.type('test2');
    addButton.click();

    const items = cy.get(`[data-cy="${fieldName}-field-item"]`);
    items.should('have.length', 2);

    const removeButtons = cy.get(
      `[data-cy="${fieldName}-field-remove-button"]`
    );
    removeButtons.should('have.length', 2);
    removeButtons.first().click();
    removeButtons.first().click();

    items.should('have.length', 0);
  });

  it('should add and remove values with keyboard', () => {
    const fieldName = 'array-field';
    clickShowMore();
    const field = getFieldByName(fieldName);

    field.focus().type('test{enter}');
    field.focus().type('test2{enter}');

    const items = cy.get(`[data-cy="${fieldName}-field-item"]`);
    items.should('have.length', 2);

    items.first().focus().type('{enter}');
    items.first().focus().type('{enter}');

    items.should('have.length', 0);
  });
});
