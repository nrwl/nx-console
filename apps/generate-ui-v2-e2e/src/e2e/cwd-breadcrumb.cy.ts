import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { schema } from '../support/test-schema';
import { visitGenerateUi } from '../support/visit-generate-ui';

describe('cwd-breadcrumb component', () => {
  let fileSeparator: string;
  beforeEach(() => {
    fileSeparator = Cypress.platform.startsWith('win') ? '\\' : '/';
    const schemaWithCwd: GeneratorSchema = {
      ...schema,
      context: {
        prefillValues: {
          cwd: `packages${fileSeparator}nested`,
        },
      },
    };
    visitGenerateUi(schemaWithCwd);
  });

  it('should display the current working directory', () => {
    shouldContainOriginalPath();
  });

  it('should navigate to directory when clicking on breadcrumb item', () => {
    cy.get("[data-cy='cwd-breadcrumb-segment-0']").click();
    cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'packages');
    cy.get("[data-cy='cwd-breadcrumb']").should('not.contain', 'nested');
  });

  it('should use inline edit with buttons to edit path', () => {
    cy.get("[data-cy='inline-edit-button']").click();
    cy.get("[data-cy='inline-edit-field']").type(
      `{selectall}{backspace}packages${fileSeparator}hello`
    );
    cy.get("[data-cy='inline-edit-confirm']").click();
    shouldContainModifiedPath();
  });

  it('should use inline edit with enter key to edit path', () => {
    cy.get("[data-cy='inline-edit-button']").click();
    cy.get("[data-cy='inline-edit-field']").type(
      `{selectall}{backspace}packages${fileSeparator}hello{enter}`
    );
    shouldContainModifiedPath();
  });

  it('should use inline edit with buttons to cancel edit', () => {
    cy.get("[data-cy='inline-edit-button']").click();
    cy.get("[data-cy='inline-edit-field']").type(
      `{selectall}{backspace}packages${fileSeparator}hello`
    );
    cy.get("[data-cy='inline-edit-cancel']").click();
    shouldContainOriginalPath();
    cy.get("[data-cy='cwd-breadcrumb']").should('not.contain', 'hello');
  });

  it('should use inline edit with escape key to cancel edit', () => {
    cy.get("[data-cy='inline-edit-button']").click();
    cy.get("[data-cy='inline-edit-field']").type(
      `{selectall}{backspace}packages${fileSeparator}hello{esc}`
    );
    shouldContainOriginalPath();
    cy.get("[data-cy='cwd-breadcrumb']").should('not.contain', 'hello');
  });
});

function shouldContainOriginalPath() {
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'Working Directory');
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', '{workspaceRoot}');
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'packages');
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'nested');
}

function shouldContainModifiedPath() {
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'Working Directory');
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', '{workspaceRoot}');
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'packages');
  cy.get("[data-cy='cwd-breadcrumb']").should('contain', 'hello');
}
