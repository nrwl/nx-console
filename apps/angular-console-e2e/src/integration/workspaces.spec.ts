import {
  checkButtonIsDisabled,
  selectFolder,
  uniqName,
  whitelistGraphql
} from './utils';

describe('Workspaces', () => {
  const name = uniqName('workspace');

  beforeEach(() => {
    whitelistGraphql();
    cy.visit('/workspaces');
    cy.get('.add-workspace-container').trigger('mouseover');
  });

  it('creates new workspaces', () => {
    cy.get('.add-workspace-fab').click({ force: true });
    checkButtonIsDisabled('Create', true);

    selectFolder();
    checkButtonIsDisabled('Create', true);

    cy.wait(800);
    cy.focused().type(name + '{enter}');
    cy.wait(800);
    checkButtonIsDisabled('Create', true);
    cy.wait(800);
    cy.get('.js-select-schematic .mat-pseudo-checkbox')
      .first()
      .click({ force: true });
    cy.wait(800);
    checkButtonIsDisabled('Create', false);

    cy.get('button')
      .contains('Create')
      .click();

    cy.contains('div.title', 'Projects', { timeout: 120000 });

    cy.get('div.title').contains(name);
  });

  // TODO(mrmeku): re-enable this test after figuring out how to mock graphql requests.
  // it('opens a workspace', () => {
  //   cy.get('a[href="/open-workspace"]').click();
  //   cy.get('div.title').contains('Open Workspace');
  //   checkButtonIsDisabled('Create', true);
  //   expandFolder('tmp');
  //   selectFolder(name);
  //   cy.get('div.context-title').contains(`Selected Workspace: ${name}`);

  //   cy.get('button')
  //     .contains('Open')
  //     .click();

  //   cy.get('div.title').contains('Projects');
  // });
});
