import {
  getFields,
  getFieldNavItems,
  clickShowMore,
  getFieldByName,
  getFieldErrorByName,
  getFieldNavItemByName,
} from '../support/get-elements';

describe('field list', () => {
  beforeEach(() => cy.visit('/'));

  it('should show only important fields by default', () => {
    getFields().should('have.length', 2);
    getFieldNavItems().should('have.length', 2);
  });

  it('should show and hide fields when button is clicked', () => {
    clickShowMore();
    getFields().should('have.length', 6);
    getFieldNavItems().should('have.length', 6);
    clickShowMore();
    getFields().should('have.length', 2);
    getFieldNavItems().should('have.length', 2);
  });

  it('should filter items based on the search bar', () => {
    cy.get('[id="search-bar"]').type('option1');
    getFields().should('have.length', 1);
    getFieldNavItems().should('have.length', 1);
    cy.get('[data-cy="show-more"]').should('not.be.visible');
  });

  it('should render correct fields based on the schema', () => {
    clickShowMore();
    getFields().then((fields) => {
      const tagNames = fields
        .map((_, field) => field.tagName.toLowerCase())
        .get();
      expect(tagNames).to.deep.eq([
        'input-field',
        'select-field',
        'checkbox-field',
        'multiselect-field',
        'array-field',
        'input-field',
      ]);
    });
  });

  const errorClass = 'text-error';

  it('should correctly show validation for required field', () => {
    const fieldName = 'option1';
    const field = getFieldByName(fieldName);
    field.type('test');

    getFieldErrorByName(fieldName).should('not.exist');
    getFieldNavItemByName(fieldName).should('not.have.class', errorClass);

    field.clear();

    getFieldErrorByName(fieldName).should('have.length', 1);
    getFieldNavItemByName(fieldName).should('have.class', errorClass);
  });

  it('should correctly show validation for field with pattern', () => {
    const fieldName = 'option2';
    clickShowMore();
    const field = getFieldByName(fieldName);
    field.type('test');

    getFieldErrorByName(fieldName).should('not.exist');
    getFieldNavItemByName(fieldName).should('not.have.class', errorClass);

    field.clear();
    field.type('123');

    getFieldErrorByName(fieldName).should('have.length', 1);
    getFieldNavItemByName(fieldName).should('have.class', errorClass);
  });
});
