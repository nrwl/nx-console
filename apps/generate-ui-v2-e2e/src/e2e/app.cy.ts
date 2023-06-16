import { schema } from '../test-schema.mjs';
import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { getFields } from '../support/get-elements';

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
  });
});
