import { getFieldByName } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';

describe('Form Value Update', () => {
  beforeEach(() => {
    visitGenerateUi({
      collectionName: '@nx/test',
      generatorName: 'test',
      description: 'description',
      options: [
        {
          name: 'name',
          type: 'string',
          isRequired: false,
          aliases: [],
        },
        {
          name: 'directory',
          type: 'string',
          isRequired: false,
          aliases: [],
        },
      ],
    });

    // Wait for the UI to be ready with generator schema
    cy.get('[data-cy="title"]').should('be.visible');
  });

  it('should update field values when receiving form-value updates from IDE', () => {
    getFieldByName('name').should('have.value', '');
    getFieldByName('directory').should('have.value', '');

    cy.window().then((win) => {
      (win as any).intellijApi?.postToWebview({
        payloadType: 'update-form-values',
        payload: {
          name: 'Updated Test Name',
          directory: 'apps/updated-test-dir',
        },
      });
    });

    getFieldByName('name').should('have.value', 'Updated Test Name');

    getFieldByName('directory').should('have.value', 'apps/updated-test-dir');
  });

  it('should update CWD breadcrumb when receiving form-value updates from IDE', () => {
    cy.get('[data-cy="cwd-breadcrumb"]').should('be.visible');
    cy.get('[data-cy="inline-edit-button"]').click();
    cy.get('[data-cy="inline-edit-field"]').should('have.value', '');
    cy.get("[data-cy='inline-edit-confirm']").click();

    // Simulate IDE sending cwd update
    cy.window().then((win) => {
      (win as any).intellijApi?.postToWebview({
        payloadType: 'update-form-values',
        payload: {
          cwd: 'apps/my-updated-app',
        },
      });
    });

    cy.get('[data-cy="cwd-breadcrumb"]').contains('my-updated-app');

    // Click edit button and verify value is set in the input field
    cy.get('[data-cy="inline-edit-button"]').click();
    cy.get('[data-cy="inline-edit-field"]').should(
      'have.value',
      'apps/my-updated-app',
    );
  });
});
