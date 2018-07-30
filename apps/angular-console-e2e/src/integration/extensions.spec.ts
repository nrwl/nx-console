import {
  checkDisplayedCommand,
  clickOnTask,
  goBack,
  goToExtensions,
  openProject,
  projectPath,
  taskListHeaders,
  tasks,
  texts
} from './utils';

describe('Extensions', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj-extensions'));
    goToExtensions();
    cy.get('div.title').contains('Add/Remove CLI Extensions');
  });

  it('filters extensions', () => {
    tasks($p => {
      const t = texts($p);
      expect(t[0].indexOf('@nrwl/schematics') > -1).to.equal(true);
    });

    // filter by item
    cy.get('input#filter').type('serverless');
    tasks($p => {
      const t = texts($p);
      expect(t[0].indexOf('@angular-toolkit/serverless') > -1).to.equal(true);
    });
  });

  it('adds an extension', () => {
    clickOnTask('Available Extensions', '@progress/kendo-angular-menu', false);
    cy.get('div.context-title').contains(
      '@progress/kendo-angular-menu extension'
    );

    cy.get('button')
      .contains('Add')
      .click();

    cy.wait(100);

    checkDisplayedCommand(`$ ng add @progress/kendo-angular-menu`);

    goBack();

    cy.get('div.title').contains('Add/Remove CLI Extensions');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('Available Extensions');
    });
  });
});
