import {
  autocompletion,
  checkFieldError,
  clickOnTask,
  els,
  goToGenerate,
  openProject,
  projectPath,
  texts,
  uniqName,
  waitForAutocomplete
} from './utils';

describe('Forms', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
    openProject(projectPath());
    goToGenerate();
    clickOnTask('service');
  });

  it('supports basic validations', () => {
    cy.get('input[name="name"]').type('a');
    cy.get('input[name="name"]').clear();
    cy.get('input[name="project"').type('proj');

    checkFieldError('name', true);

    cy.get('input[name="name"]').type(uniqName('someservice'));
    checkFieldError('name', false);
  });

  it('supports module autocompletion', () => {
    cy.get('input[name="project"]').type('e2e');

    autocompletion($p => {
      expect(texts($p)[0]).to.contain('proj-e2e');
    });

    cy.get('input[name="project"]').clear();
    cy.get('input[name="project"]').type('proj');
    waitForAutocomplete();

    autocompletion($p => {
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
  });
});
