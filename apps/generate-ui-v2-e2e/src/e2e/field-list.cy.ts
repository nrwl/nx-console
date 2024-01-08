import {
  getFields,
  getFieldNavItems,
  clickShowMore,
  getFieldByName,
  getFieldErrorByName,
  getFieldNavItemByName,
} from '../support/get-elements';
import { schema } from '../support/test-schema';
import { visitGenerateUi } from '../support/visit-generate-ui';

describe('field list', () => {
  beforeEach(() => visitGenerateUi(schema));

  it('should show only important fields by default', () => {
    getFields().should('have.length', 2);
  });

  it('should show and hide fields when button is clicked', () => {
    clickShowMore();
    getFields().should('have.length', 6);
    clickShowMore();
    getFields().should('have.length', 2);
  });

  it('should filter items based on the search bar', () => {
    cy.get('[id="search-bar"]').type('option1');
    getFields().should('have.length', 1);
    cy.get('[data-cy="show-more"]').should('not.exist');
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

  describe('field nav', () => {
    const greyedOutClass = 'text-mutedForeground';

    it('should show all fields and some greyed out by default', () => {
      getFieldNavItems().should('have.length', 6);
      getFieldNavItems().filter(`.${greyedOutClass}`).should('have.length', 4);
    });

    it('should show all fields and none greyed when expanded', () => {
      clickShowMore();
      getFieldNavItems().should('have.length', 6);
      getFieldNavItems().filter(`.${greyedOutClass}`).should('have.length', 0);
    });

    it('should filter nav items based on the search bar', () => {
      cy.get('[id="search-bar"]').type('option1');
      getFieldNavItems().should('have.length', 1);
      cy.get('[data-cy="show-more"]').should('not.exist');
    });

    it('should expand items and scroll to them when clicked', () => {
      getFieldNavItemByName('option2')
        .should('be.visible')
        .click({ force: true });
      cy.clock().tick(100);
      getFields().should('have.length', 6);
      getFieldNavItems().filter(`.${greyedOutClass}`).should('have.length', 0);
      getFieldByName('option2').should('be.visible');
    });
  });
});
