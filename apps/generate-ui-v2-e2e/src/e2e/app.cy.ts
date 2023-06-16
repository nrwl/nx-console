import { schema } from '../test-schema.mjs';
import {
  clickShowMore,
  getFieldByName,
  getFieldErrorByName,
  getFieldNavItemByName,
  getFieldNavItems,
  getFields,
} from '../support/get-elements';
import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';

describe('generate-ui-v2', () => {
  beforeEach(() => cy.visit('/'));

  describe('header', () => {
    it('should display generator name', () => {
      cy.get("[data-cy='header-text']").should(
        'contain.text',
        `nx generate ${schema.collectionName}:${schema.generatorName}`
      );
    });

    it('should send message when generate button is clicked', () => {
      spyOnConsoleLog().then((consoleLog) => {
        cy.get("[data-cy='generate-button']").click();
        expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      });
    });
  });

  describe('field list', () => {
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

    it('should correctly show validation for required field', () => {
      const fieldName = 'option1';
      const field = getFieldByName(fieldName);
      field.type('test');

      getFieldErrorByName(fieldName).should('not.exist');
      getFieldNavItemByName(fieldName).should('not.have.class', 'text-red-500');

      field.clear();

      getFieldErrorByName(fieldName).should('have.length', 1);
      getFieldNavItemByName(fieldName).should('have.class', 'text-red-500');
    });
  });

  describe('array field', () => {
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
      const addButton = cy.get(`[data-cy="${fieldName}-field-add-button"]`);

      field.focus().type('test{enter}');
      field.focus().type('test2{enter}');

      const items = cy.get(`[data-cy="${fieldName}-field-item"]`);
      items.should('have.length', 2);

      items.first().focus().type('{enter}');
      items.first().focus().type('{enter}');

      items.should('have.length', 0);
    });
  });
});
