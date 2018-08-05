import {
  autocompletion,
  checkButtonIsDisabled,
  checkDisplayedCommand,
  checkFieldHasClass,
  clickOnTask,
  goToGenerate,
  openProject,
  projectPath,
  texts,
  toggleBoolean,
  uniqName,
  waitForAutocomplete
} from './utils';

describe('Forms', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj'));
    goToGenerate();
    cy.get('div.title').contains('Generate Code');

    clickOnTask('@schematics/angular', 'component');
    cy.get('div.context-title').contains('Create an Angular component');
  });

  it('supports basic validations', () => {
    cy.get('input[name="name"]').type('a');
    cy.get('input[name="name"]').clear();
    cy.get('input[name="project"').type('proj');

    checkFieldHasClass('name', true, 'error');
    checkButtonIsDisabled('Generate', true);

    cy.get('input[name="name"]').type(uniqName('someservice'));
    checkFieldHasClass('name', false, 'error');
    checkButtonIsDisabled('Generate', false);
  });

  it('supports project autocompletion', () => {
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

  it('supports module autocompletion', () => {
    cy.get('input[name="module"]').type('nothing');

    autocompletion($p => {
      expect($p.length).to.equal(0);
    });

    cy.get('input[name="module"]').clear();
    cy.get('input[name="module"]').type('app');
    waitForAutocomplete();

    autocompletion($p => {
      expect($p.length).to.equal(1);
      expect(texts($p)[0]).to.include('app.module.ts');
    });
  });

  it('updates the command in the terminal', () => {
    checkDisplayedCommand('$ ng generate component --dry-run');

    cy.get('input[name="name"]').type('cmp');
    checkDisplayedCommand('$ ng generate component cmp --dry-run');

    toggleBoolean('export');
    checkDisplayedCommand('$ ng generate component cmp --export --dry-run');

    toggleBoolean('export');
    checkDisplayedCommand('$ ng generate component cmp --dry-run');
  });
});
