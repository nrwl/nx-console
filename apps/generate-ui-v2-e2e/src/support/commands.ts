// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Chainable<Subject> {
    /**
     * Simulate updating form values from the IDE
     * @param formValues Record of form field values to update
     */
    updateFormValues(formValues: Record<string, any>): Chainable<void>;
  }
}

Cypress.Commands.add('updateFormValues', (formValues: Record<string, any>) => {
  cy.window().then((win) => {
    win.dispatchEvent(
      new MessageEvent('message', {
        data: {
          payloadType: 'update-form-values',
          payload: formValues,
        },
      }),
    );
  });
});
