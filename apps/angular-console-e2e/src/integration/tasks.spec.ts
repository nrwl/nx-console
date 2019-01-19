import {
  checkDisplayedCommand,
  checkFileExists,
  clickOnFieldGroup,
  clickOnTask,
  goBack,
  goToTasks,
  openProject,
  projectPath,
  taskListHeaders,
  tasks,
  texts,
  waitForActionToComplete,
  waitForAnimation,
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

const PASSING_TESTS = `
import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  }));

  it(\`should have as title 'proj'\`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('proj');
  });

  it('should do stuff', () => {
    expect(true).toBe(true);
  });
});
`;
const FAILING_TESTS = `
import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  }));

  it(\`should have as title 'proj'\`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('NOPE');
  });

  it('should do stuff', () => {
    expect(true).toBe(true);
  });
});
`;

const GOOD_CMP = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'proj';
}
`;
const BAD_CMP = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent oops!
`;

describe('Tasks', () => {
  beforeEach(() => {
    whitelistGraphql();
    openProject(projectPath('proj'));
    goToTasks();
    cy.contains('div.title', 'Tasks');
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

  it('runs build and show recent tasks', () => {
    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);
    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', PASSING_TESTS);

    clearAllRecentTasks();

    clickOnTask('proj', 'build');

    cy.contains('div.context-title', 'ng build proj');

    checkDisplayedCommand('ng build proj');

    cy.contains('mat-radio-button', 'Production').click();
    checkDisplayedCommand('ng build proj --configuration=production');

    cy.contains('mat-radio-button', 'Default').click();
    checkDisplayedCommand('ng build proj');

    cy.contains('button', 'Run').click();

    cy.contains('div.js-status-build-success', 'Build completed', {
      timeout: 180000
    });
    cy.contains('div.js-status-build-folder', 'is ready', { timeout: 180000 });

    checkFileExists(`dist/proj/main.js`);
    checkActionBarHidden();

    goBack();

    cy.contains('div.title', 'Tasks');
    taskListHeaders($p => {
      expect(texts($p).filter(r => r === 'proj').length).to.equal(1);
    });

    checkSingleRecentTask({
      command: 'ng build proj',
      status: CommandStatus.SUCCESSFUL
    });

    waitForAnimation();

    clickOnTask('proj', 'lint');
    cy.contains('div.context-title', 'ng lint proj');

    checkDisplayedCommand('ng lint proj');

    cy.contains('button', 'Run').click();

    checkActionBarHidden();

    cy.wait(100);

    goBack();

    cy.contains('div.title', 'Tasks');

    waitForAnimation();

    checkMultipleRecentTasks({
      numTasks: 2,
      isExpanded: false
    });

    toggleRecentTasksExpansion();

    waitForAnimation();

    checkMultipleRecentTasks({
      numTasks: 2,
      isExpanded: true,
      tasks: [
        { command: 'ng build proj', status: CommandStatus.SUCCESSFUL },
        { command: 'ng lint proj', status: CommandStatus.IN_PROGRESS }
      ]
    });

    clearAllRecentTasks();

    checkActionBarHidden();
  });

  it('runs an npm script', () => {
    clickOnTask('package.json scripts', 'build');
    cy.contains('div.context-title', 'run build');

    checkDisplayedCommand('yarn run build');

    cy.contains('button', 'Run').click();

    goBack();

    cy.contains('div.title', 'Tasks');
    taskListHeaders($p => {
      expect(texts($p).filter(r => r === 'proj').length).to.equal(1);
    });

    clearAllRecentTasks();
  });

  it('runs test task', () => {
    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', FAILING_TESTS);
    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);

    clickOnTask('proj', 'test');

    cy.get('div.context-title').contains('ng test proj');

    waitForAnimation();

    cy.get('button')
      .contains('Run')
      .click();

    cy.get('div.js-status-tests-failed', { timeout: 220000 }).contains(
      'failed'
    );

    cy.get('button')
      .contains('Cancel')
      .click();

    goBack();
    clearAllRecentTasks();

    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', PASSING_TESTS);
  });

  it('runs serve task', () => {
    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);
    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', PASSING_TESTS);

    clickOnTask('proj', 'serve');

    cy.get('div.context-title').contains('ng serve proj');

    clickOnFieldGroup('Optional fields');

    waitForAnimation();

    cy.get('input[name="port"]')
      .scrollIntoView()
      .clear()
      .type('9999');

    cy.get('button')
      .contains('Run')
      .click();

    cy.get('div.js-status-build-success', { timeout: 220000 }).contains(
      'Build completed'
    );
    cy.get('div.js-status-server-url', { timeout: 220000 }).contains('browser');

    cy.get('button')
      .contains('Cancel')
      .click();

    goBack();
    clearAllRecentTasks();

    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);
  });
});
