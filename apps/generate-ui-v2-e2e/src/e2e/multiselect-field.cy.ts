import { clickShowMore, getFieldByName } from '../support/get-elements';

describe('multiselect field', () => {
  beforeEach(() => cy.visit('/'));
  it('should add and remove values by clicking', () => {
    const fieldName = 'multiselect-field';
    clickShowMore();
    const field = getFieldByName(fieldName);

    field.select('option1');
    field.select('option2');

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
    const fieldName = 'multiselect-field';
    clickShowMore();
    const field = getFieldByName(fieldName);

    // navigating with keydown doesnt work in cypress?
    field.select('option1');
    field.select('option2');

    const items = cy.get(`[data-cy="${fieldName}-field-item"]`);
    items.should('have.length', 2);

    items.first().focus().type('{enter}');
    items.first().focus().type('{enter}');

    items.should('have.length', 0);
  });
});
