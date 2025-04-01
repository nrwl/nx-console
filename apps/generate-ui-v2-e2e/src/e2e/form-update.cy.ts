import { mockVsCodeApi } from '../support/mock-vscode-api';

describe('Form Value Update', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad: (win) => {
        mockVsCodeApi(win);
      },
    });

    // Wait for the UI to be ready with generator schema
    cy.get('[data-cy="title"]').should('be.visible');
  });

  it('should update field values when receiving form-value updates from IDE', () => {
    // Simulate IDE sending data to update form values
    cy.window().then((win) => {
      win.dispatchEvent(
        new MessageEvent('message', {
          data: {
            payloadType: 'update-form-values',
            payload: {
              name: 'Updated Test Name',
              directory: 'apps/updated-test-dir',
            },
          },
        }),
      );
    });

    // Verify that the name field was updated
    cy.get('input-field')
      .contains('name')
      .parent()
      .find('input')
      .should('have.value', 'Updated Test Name');

    // Verify that the directory field was updated
    cy.get('input-field')
      .contains('directory')
      .parent()
      .find('input')
      .should('have.value', 'apps/updated-test-dir');
  });

  it('should update CWD breadcrumb when receiving form-value updates from IDE', () => {
    // Initial state - CWD should be empty or the default
    cy.get('[data-cy="cwd-breadcrumb"]').should('be.visible');

    // Simulate IDE sending cwd update
    cy.window().then((win) => {
      win.dispatchEvent(
        new MessageEvent('message', {
          data: {
            payloadType: 'update-form-values',
            payload: {
              cwd: 'apps/my-updated-app',
            },
          },
        }),
      );
    });

    // Verify that the CWD breadcrumb is updated
    cy.get('[data-cy="cwd-breadcrumb"]').contains('my-updated-app');

    // Click edit button and verify value is set in the input field
    cy.get('[data-cy="inline-edit-button"]').click();
    cy.get('[data-cy="inline-edit-field"]').should(
      'have.value',
      'apps/my-updated-app',
    );
  });
});
