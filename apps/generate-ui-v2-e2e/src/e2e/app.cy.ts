import { schema } from '../test-schema.mjs';
import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { clickShowMore, getFieldByName } from '../support/get-elements';

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

  describe('form values', () => {
    it('should properly pass values to generator', () => {
      clickShowMore();
      getFieldByName('option1').type('test-option1');
      getFieldByName('select-field').select('option1');
      getFieldByName('checkbox-field').click();
      getFieldByName('multiselect-field').select('option1');
      getFieldByName('multiselect-field').select('option2');
      getFieldByName('array-field').type('test-value{enter}');
      getFieldByName('array-field').type('test-value2{enter}');
      getFieldByName('option2').type('test-option2');

      spyOnConsoleLog().then((consoleLog) => {
        cy.get('body').type('{ctrl}{enter}');
        expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
        expectConsoleLogToHaveBeenCalledWith(
          consoleLog,
          '--option1=test-option1'
        );
        expectConsoleLogToHaveBeenCalledWith(
          consoleLog,
          '--select-field=option1'
        );
        expectConsoleLogToHaveBeenCalledWith(
          consoleLog,
          '--checkbox-field=true'
        );
        expectConsoleLogToHaveBeenCalledWith(
          consoleLog,
          '--multiselect-field=option1,option2'
        );
        expectConsoleLogToHaveBeenCalledWith(
          consoleLog,
          '--array-field=test-value,test-value2'
        );
        expectConsoleLogToHaveBeenCalledWith(
          consoleLog,
          '--option2=test-option2'
        );
      });
    });
  });
  describe('keyboard shortcuts', () => {
    it('should be able to focus search bar with shortcut', () => {
      cy.get('body').type('{ctrl}s');
      cy.get('[id="search-bar"]').should('be.focused');
    });
    it('should be able to run generator with shortcut', () => {
      spyOnConsoleLog().then((consoleLog) => {
        cy.get('body').type('{ctrl}{enter}');
        expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      });
    });
    it('should be able to dry run generator with shortcut', () => {
      spyOnConsoleLog().then((consoleLog) => {
        cy.get('body').type('{ctrl}{shift}{enter}');
        expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
        expectConsoleLogToHaveBeenCalledWith(consoleLog, '--dry-run');
      });
    });
  });
});
