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
  uniqName,
  waitForAutocomplete,
  whitelistGraphql
} from './utils';

describe('Forms', () => {
  beforeEach(() => {
    whitelistGraphql();
    openProject(projectPath('proj'));
    goToGenerate();
    cy.contains('div.title', 'Generate');

    clickOnTask('@schematics/angular', 'component');
    cy.contains('div.context-title', '@schematics/angular - component');
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
    waitForAutocomplete();

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
    waitForAutocomplete();

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
    checkDisplayedCommand(
      'ng generate @schematics/angular:component --dry-run'
    );

    cy.get('input[name="name"]').type('cmp');
    checkDisplayedCommand(
      'ng generate @schematics/angular:component cmp --dry-run'
    );

    cy.get('mat-select[name="export"]').click();
    cy.contains('.mat-select-panel .mat-option', 'true').click({ force: true });
    checkDisplayedCommand(
      'ng generate @schematics/angular:component cmp --export --dry-run'
    );

    cy.get('mat-select[name="export"]').click();
    cy.contains('.mat-select-panel .mat-option', 'false').click({
      force: true
    });
    checkDisplayedCommand(
      'ng generate @schematics/angular:component cmp --dry-run'
    );
  });
});
