import {
  checkDisplayedCommand,
  checkFileExists,
  clickOnTask,
  goToTasks,
  openProject,
  projectPath,
  taskListHeaders,
  texts,
  waitForAnimation,
  waitForBuild
} from './utils';

describe('Tasks', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
  });

  it('runs a task', () => {
    openProject(projectPath());
    goToTasks();

    taskListHeaders($p => {
      expect(texts($p).filter(r => r === 'proj').length).to.equal(1);
    });
    clickOnTask('build');
    waitForAnimation();

    cy.get('button')
      .contains('Run')
      .click();

    checkDisplayedCommand('$ ng build proj');

    waitForBuild();
    checkFileExists(`dist/proj/main.js`);
  });
});
