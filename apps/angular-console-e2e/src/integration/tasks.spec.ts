import {
  checkDisplayedCommand,
  checkMessage,
  checkFileExists,
  clickOnTask,
  goBack,
  goToTasks,
  openProject,
  projectPath,
  taskListHeaders,
  tasks,
  texts,
  waitForActionToComplete,
  whitelistGraphql
} from './utils';
import {
  checkMultipleRecentTasks,
  checkSingleRecentTask,
  CommandStatus,
  toggleRecentTasksExpansion,
  checkActionBarHidden,
  clearAllRecentTasks
} from './tasks.utils';

describe('Tasks', () => {
  beforeEach(() => {
    whitelistGraphql();
    cy.visit('/workspaces');
    openProject(projectPath('proj'));
    goToTasks();
    cy.get('div.title').contains('Run Tasks');
  });

  it('filters tasks', () => {
    taskListHeaders($p => {
      expect($p.length).to.equal(3);
      expect(texts($p)[0]).to.equal('package.json scripts');
      expect(texts($p)[1]).to.equal('proj');
      expect(texts($p)[2]).to.equal('proj-e2e');
    });

    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('build') > -1).to.equal(true);
      expect(t.indexOf('serve') > -1).to.equal(true);
    });

    // filter by item
    cy.get('input#filter').type('build');
    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('build') > -1).to.equal(true);
      expect(t.indexOf('serve') > -1).to.equal(false);
    });

    // filter by project
    cy.get('input#filter').clear();
    cy.get('input#filter').type('proj-e2e');

    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('e2e') > -1).to.equal(true);
      expect(t.indexOf('lint') > -1).to.equal(true);
    });
  });

  it('runs a task', () => {
    clickOnTask('proj', 'build');
    cy.get('div.context-title').contains('ng build proj');

    checkDisplayedCommand('$ ng build proj');

    cy.get('mat-radio-button')
      .contains('Production')
      .click();
    checkDisplayedCommand('$ ng build proj --configuration=production');

    cy.get('mat-radio-button')
      .contains('Default')
      .click();
    checkDisplayedCommand('$ ng build proj');

    cy.get('button')
      .contains('Run')
      .click();

    waitForActionToComplete();
    checkFileExists(`dist/proj/main.js`);
    checkActionBarHidden();

    goBack();

    cy.get('div.title').contains('Run Tasks');
    taskListHeaders($p => {
      expect(texts($p).filter(r => r === 'proj').length).to.equal(1);
    });
  });

  it('show the recent tasks bar after navigating away', () => {
    checkSingleRecentTask({
      command: 'ng build proj',
      status: CommandStatus.SUCCESSFUL
    });

    clickOnTask('proj', 'test');
    cy.get('div.context-title').contains('ng test proj');

    checkDisplayedCommand('$ ng test proj');

    cy.get('button')
      .contains('Run')
      .click();

    checkActionBarHidden();

    cy.wait(100);

    goBack();

    cy.get('div.title').contains('Run Tasks');

    checkMultipleRecentTasks({
      numTasks: 2,
      isExpanded: false
    });

    toggleRecentTasksExpansion();

    checkMultipleRecentTasks({
      numTasks: 2,
      isExpanded: true,
      tasks: [
        { command: 'ng build proj', status: CommandStatus.SUCCESSFUL },
        { command: 'ng test proj', status: CommandStatus.IN_PROGRESS }
      ]
    });

    clearAllRecentTasks();

    checkActionBarHidden();
  });

  it('runs an npm script', () => {
    clickOnTask('package.json scripts', 'build');
    cy.get('div.context-title').contains('run build');

    checkDisplayedCommand('$ yarn run build');

    cy.get('button')
      .contains('Run')
      .click();

    goBack();

    cy.get('div.title').contains('Run Tasks');
    taskListHeaders($p => {
      expect(texts($p).filter(r => r === 'proj').length).to.equal(1);
    });
  });
});
