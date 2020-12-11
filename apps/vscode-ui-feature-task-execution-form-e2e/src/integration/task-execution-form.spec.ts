describe('task-execution-form.spec', () => {
  describe('Default values', () => {
    before(() => {
      cy.visit('/iframe.html?id=feature-task-execution-form--default-values');
    });
    it('should set input to value of field default', () => {
      cy.get('[data-cy=application]').contains('nxConsole');
    });
    it('should set checkbox to value of field default', () => {
      cy.get('[data-cy=addE2EProject]').contains('true');
    });
    it('should set select to value of field default', () => {
      cy.get('[data-cy=style]').contains('scss');
    });
    it('should set multiple select to value of field default', () => {
      cy.get('[data-cy=libraries]').contains('data-access,feature');
    });
    it('should setautocomplete to value of field default', () => {
      cy.get('[data-cy=color]').contains('Beige');
    });
  });
  describe('Entered values', () => {
    before(() => {
      cy.visit(
        '/iframe.html?id=feature-task-execution-form--no-default-values'
      );
    });
    it('should set input value to typed text', () => {
      cy.get('nx-console-input input').type('testInput');
      cy.get('[data-cy=application]').contains('testInput');
    });
    it('should set multiple select value to selected options', () => {
      cy.get('nx-console-multiple-select select').select(['feature', 'util']);
      cy.get('[data-cy=libraries]').contains('feature,util');
    });
    it('should set select value to selected option', () => {
      cy.get('nx-console-select select').select('less');
      cy.get('[data-cy=style]').contains('less');
    });
    it('should update checkbox value when it is clicked', () => {
      cy.get('nx-console-checkbox .bool-control').click();
      cy.get('[data-cy=addE2EProject]').contains('true');
    });
    it('should update autocomplete to selected option', () => {
      cy.get('nx-console-autocomplete input').click();
      cy.get('nx-console-autocomplete .option')
        .eq(0)
        .click();
      cy.get('[data-cy=color]').contains('AliceBlue');
    });
  });
});
