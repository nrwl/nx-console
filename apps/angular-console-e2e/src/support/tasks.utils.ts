import { elementContainsText } from '../support/utils';

interface Task {
  command: string;
  status: CommandStatus;
}

export enum CommandStatus {
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  IN_PROGRESS = 'in-progress',
  TERMINATED = 'terminated'
}

export function checkActionBarHidden() {
  cy.get('angular-console-action-bar .action-bar', { timeout: 3000 }).should(
    $el => {
      expect($el).to.have.css('height', '0px');
    }
  );

  cy.get('angular-console-action-bar mat-list', { timeout: 3000 }).should(
    $el => {
      expect($el).to.have.css('height', '0px');
    }
  );
}

export function checkSingleRecentTask(task: Task) {
  cy.get('angular-console-action-bar mat-list-item').should(tasks => {
    expect(tasks.length).to.equal(1);
    expect(tasks).visible;

    expect(
      tasks
        .find('.command-text')
        .get(0)
        .textContent!.trim()
    ).to.equal(task.command);

    expect(tasks.find(`.task-avatar.${task.status}`)).visible;
  });
}

export function checkMultipleRecentTasks(options: {
  tasks?: Task[];
  isExpanded: boolean;
  numTasks: number;
}) {
  elementContainsText(
    'angular-console-action-bar .num-tasks',
    `${options.numTasks} Tasks`
  );

  if (!options.isExpanded) {
    cy.get('angular-console-action-bar .remove-all-tasks-button', {
      timeout: 3000
    }).should('have.length', 0);
  } else {
    cy.get('angular-console-action-bar .remove-all-tasks-button', {
      timeout: 3000
    }).should('have.length', 1);
  }

  cy.get('angular-console-action-bar mat-list-item', { timeout: 3000 }).should(
    'have.length',
    options.numTasks
  );

  if (options.tasks) {
    options.tasks.forEach(task => {
      elementContainsText('mat-list-item .command-text', task.command);
      cy.get(`.task-avatar.${task.status}`, { timeout: 3000 }).should(
        'not.be.undefined'
      );
    });
  }
}

export function toggleRecentTasksExpansion() {
  cy.get('angular-console-action-bar .action-bar').click({ force: true });
  cy.wait(500);
}

export function clearAllRecentTasks() {
  cy.get('button').then(buttons => {
    for (let i = 0; i < buttons.length; ++i) {
      const b = buttons[i];
      if (
        b.className.indexOf('remove-all-tasks-button') > -1 ||
        b.className.indexOf('remove-task-button') > -1
      ) {
        cy.wait(300);
        b.click();
      }
    }
  });
  cy.wait(500);
}

export function clearRecentTask() {
  cy.get('angular-console-action-bar .remove-task-button').then(buttons => {
    if (buttons) {
      cy.wrap(buttons).click({ force: true, multiple: true });
    }
  });
  cy.wait(500);
}
