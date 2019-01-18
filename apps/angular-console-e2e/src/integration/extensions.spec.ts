import {
  checkDisplayedCommand,
  clickOnTask,
  goBack,
  goToExtensions,
  goToGenerate,
  openProject,
  projectPath,
  taskListHeaders,
  tasks,
  texts,
  waitForActionToComplete,
  waitForAnimation,
  whitelistGraphql
} from './utils';
import { clearAllRecentTasks } from './tasks.utils';

describe('Extensions', () => {
  beforeEach(() => {
    whitelistGraphql();
    openProject(projectPath('proj-extensions'));
    goToExtensions();
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
    clickOnTask('Available Extensions', '@angular/material', false);
    cy.contains('div.context-title', '@angular/material');

    cy.contains('button', 'Add').click();

    checkDisplayedCommand(`ng add @angular/material`);

    waitForActionToComplete();

    goBack();

    cy.contains('div.title', 'Add CLI Extensions');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('Available Extensions');
    });
    waitForAnimation();

    // check that the schematics added by angular material are available
    goToGenerate();
    cy.wait(300); // Needed to de-flake this test
    taskListHeaders($p => {
      expect(texts($p)[1]).to.equal('@angular/material');
    });
  });

  after(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj'));
    clearAllRecentTasks();
  });
});
