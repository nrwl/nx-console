// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

function responseStub(result) {
    return {
      json() {
        return Promise.resolve(result);
      },
      text() {
        return Promise.resolve(JSON.stringify(result));
      },
      ok: true,
    };
  }


cy.on('window:before:load', (win) => {
    const originalFunction = win.fetch;

    function fetch(path, { body, method }) {
      if (path.includes('/graphql') && method === 'POST') {
        const { operationName, query, variables } = JSON.parse(req.body);
        if (operationName === 'GetDirectoryPath') {
            return responseStub({
                data: {

                }
            });
        }
      }

      return originalFunction.apply(this, arguments);
    }

    cy.stub(win, 'fetch', fetch).as('graphqlStub');
  });
