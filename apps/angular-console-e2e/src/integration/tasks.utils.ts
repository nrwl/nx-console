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
  cy.get('angular-console-action-bar .action-bar').should($el => {
    expect($el).to.have.css('height', '0px');
  });

  cy.get('angular-console-action-bar mat-list').should($el => {
    expect($el).to.have.css('height', '0px');
  });
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
  cy.get('angular-console-action-bar').should(actionBar => {
    expect(
      actionBar
        .find('.num-tasks')
        .text()
        .trim()
    ).to.equal(`${options.numTasks} Tasks`);

    if (!options.isExpanded) {
      expect(actionBar.find('.remove-all-tasks-button').length).to.equal(0);
    } else {
      expect(actionBar.find('.remove-all-tasks-button').length).to.equal(1);
    }

    const taskElements = actionBar.get(0).querySelectorAll('mat-list-item');

    expect(taskElements.length).to.equal(options.numTasks);

    if (options.tasks) {
      options.tasks.forEach((task, index) => {
        const taskElement = taskElements[index];
        expect(
          taskElement.querySelector('.command-text')!.textContent!.trim()
        ).to.equal(task.command);

        expect(taskElement.querySelector(`.task-avatar.${task.status}`)).not.to
          .be.null;
      });
    }
  });
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
