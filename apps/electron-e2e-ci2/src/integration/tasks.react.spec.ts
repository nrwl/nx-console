import {
  clickOnFieldGroup,
  clickOnTask,
  openWorkspace,
  projectPath,
  whitelistGraphql
} from '@angular-console/cypress';

xdescribe('Tasks (React)', () => {
  let GOOD_CMP: string, BAD_CMP: string;

  beforeEach(() => {
    GOOD_CMP = `
// Good
import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./app/app";
ReactDOM.render(<App />, document.querySelector("my-app-root"));
`;
    BAD_CMP = `
// Bad syntax
import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./app/app";
ReactDOM.render(<App />, document.querySelect // Oops!
`;
    whitelistGraphql();
    openWorkspace(projectPath('proj-react'), 'tasks');
  });

  it('runs serve task for React app', () => {
    cy.writeFile('../../tmp/proj-react/apps/proj-react/src/main.tsx', BAD_CMP);
    clickOnTask('proj-react', 'serve');

    cy.get('div.context-title').contains('ng serve proj-react');

    clickOnFieldGroup('Optional fields');

    cy.get('input[name="port"]')
      .scrollIntoView()
      .clear()
      .type('9999');

    cy.get('button')
      .contains('Run')
      .click();

    cy.contains('.summary-errors .content', 'Present', { timeout: 220000 });
    cy.contains('.problem-list', `main.tsx`);

    cy.writeFile('../../tmp/proj-react/apps/proj-react/src/main.tsx', GOOD_CMP);

    cy.contains('.summary-errors .content', 'None', { timeout: 220000 });

    cy.get('button')
      .contains('Cancel')
      .click();
  });
});
