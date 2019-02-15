import {
  checkDisplayedCommand,
  clickOnTask,
  goBack,
  goToGenerate,
  openWorkspace,
  projectPath,
  taskListHeaders,
  tasks,
  texts,
  waitForActionToComplete,
  whitelistGraphql,
  elementContainsText
} from '../support/utils';
import { clearAllRecentTasks } from '../support/tasks.utils';

describe('Extensions', () => {
  beforeEach(() => {
    whitelistGraphql();
    openWorkspace(projectPath('proj-extensions'), 'extensions');
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
    elementContainsText('div.context-title', '@angular/material');

    elementContainsText('button', 'Add').click();

    checkDisplayedCommand(`ng add @angular/material`);

    waitForActionToComplete();

    goBack('Extensions');

    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('Available Extensions');
    });

    // check that the schematics added by angular material are available
    cy.wait(300); // Needed to de-flake this test
    goToGenerate();
    cy.wait(300); // Needed to de-flake this test
    taskListHeaders($p => {
      expect(texts($p)[1]).to.equal('@angular/material');
    });
  });

  after(() => {
    openWorkspace(projectPath('proj-extensions'));
    clearAllRecentTasks();
  });
});
