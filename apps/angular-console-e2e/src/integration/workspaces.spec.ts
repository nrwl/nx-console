import {
  checkButtonIsDisabled,
  expandFolder,
  selectFolder,
  uniqName,
  waitForNgNew
} from './utils';

describe('Workspaces', () => {
  const name = uniqName('workspace');

  beforeEach(() => {
    cy.visit('/workspaces');
  });

  it('creates new workspaces', () => {
    cy.get('a[href="/create-workspace"]').click();
    cy.get('div.title').contains('Create A New Workspace');
    checkButtonIsDisabled('Create', true);

    cy.get('mat-expansion-panel.directory-selector').click();
    selectFolder('tmp');
    checkButtonIsDisabled('Create', true);

    cy.get('mat-expansion-panel.name-selector').click();
    cy.get('input[name="name"]').type(name);
    checkButtonIsDisabled('Create', true);

    cy.get('mat-expansion-panel.collection-selector').click();
    cy.get('mat-radio-button[ng-reflect-value="@schematics/angular"]').should(
      $p => {
        ($p[0].querySelector('label.mat-radio-label') as any).click();
      }
    );
    checkButtonIsDisabled('Create', false);

    cy.get('button')
      .contains('Create')
      .click();

    waitForNgNew();

    cy.get('div.title').contains('Projects');

    cy.get('div.title').contains(name);
  });

  it('imports a workspace', () => {
    cy.get('a[href="/import-workspace"]').click();
    cy.get('div.title').contains('Import An Existing Workspace');
    checkButtonIsDisabled('Create', true);
    expandFolder('tmp');
    selectFolder(name);
    cy.get('div.context-title').contains(`Selected Workspace: ${name}`);

    cy.get('button')
      .contains('Import')
      .click();

    cy.get('div.title').contains('Projects');
  });
});
