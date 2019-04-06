import {
  whitelistGraphql,
  checkButtonIsDisabled,
  selectFolder,
  uniqName
} from '../support/utils';

describe('Workspaces', () => {
  const name = uniqName('workspace');

  beforeEach(() => {
    whitelistGraphql();
    cy.visit('/workspaces');
    cy.get('.add-workspace-container').trigger('mouseover', { force: true });
  });

  it('creates new workspaces', () => {
    cy.get('.add-workspace-fab').click({ force: true });
    selectFolder();
    checkButtonIsDisabled('Create', true);

    cy.get('.workspace-name-form-field input')
      .click({ force: true })
      .type(name + '{enter}');
    checkButtonIsDisabled('Create', true);
    cy.get('.js-select-schematic .mat-pseudo-checkbox')
      .first()
      .click({ force: true });
    checkButtonIsDisabled('Create', false);

    cy.get('button')
      .contains('Create')
      .click();

    cy.contains('div.title', 'Projects', { timeout: 120000 });

    cy.get('div.title').contains(name);
  });
});
