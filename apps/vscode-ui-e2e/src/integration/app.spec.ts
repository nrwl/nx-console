import { getGreeting } from '../support/app.po';

describe('vscode-ui', () => {
  beforeEach(() => cy.visit('/'));

  it('should display welcome message', () => {
    getGreeting().contains('Welcome to vscode-ui!');
  });
});
