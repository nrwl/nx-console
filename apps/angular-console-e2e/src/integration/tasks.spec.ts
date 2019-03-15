import {
  checkDisplayedCommand,
  checkFileExists,
  clickOnFieldGroup,
  clickOnTask,
  goBack,
  openWorkspace,
  projectPath,
  taskListHeaders,
  tasks,
  texts,
  whitelistGraphql,
  elementContainsText
} from '../support/utils';
import {
  checkMultipleRecentTasks,
  checkSingleRecentTask,
  CommandStatus,
  toggleRecentTasksExpansion,
  checkActionBarHidden,
  clearAllRecentTasks
} from '../support/tasks.utils';

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

describe('Tasks', () => {
  beforeEach(() => {
    whitelistGraphql();
    openWorkspace(projectPath('proj'), 'tasks');
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

  xit('runs build and show recent tasks', () => {
    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);
    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', PASSING_TESTS);

    clearAllRecentTasks();

    clickOnTask('proj', 'build');

    elementContainsText('div.context-title', 'ng build proj');

    checkDisplayedCommand('ng build proj');

    elementContainsText('mat-radio-button', 'Production').click();
    checkDisplayedCommand('ng build proj --configuration=production');

    elementContainsText('mat-radio-button', 'Default').click();
    checkDisplayedCommand('ng build proj');

    elementContainsText('button', 'Run').click();

    elementContainsText(
      'div.js-status-build-success',
      'Build completed',
      180000
    );
    elementContainsText('div.js-status-build-folder', 'is ready', 180000);

    checkFileExists(`dist/proj/main.js`);
    checkActionBarHidden();

    goBack('Tasks');

    taskListHeaders($p => {
      expect(texts($p).filter(r => r === 'proj').length).to.equal(1);
    });

    checkSingleRecentTask({
      command: 'ng build proj',
      status: CommandStatus.SUCCESSFUL
    });

    cy.wait(1000);

    clickOnTask('proj', 'lint');

    cy.wait(1000);

    elementContainsText('div.context-title', 'ng lint proj', 5000);
    checkDisplayedCommand('ng lint proj', 5000);

    elementContainsText('button', 'Run').click();

    checkActionBarHidden();

    cy.wait(100);

    goBack('Tasks');

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
        { command: 'ng lint proj', status: CommandStatus.IN_PROGRESS }
      ]
    });

    clearAllRecentTasks();

    checkActionBarHidden();
  });

  it('runs an npm script', () => {
    clickOnTask('package.json scripts', 'build');
    elementContainsText('div.context-title', 'run build');

    checkDisplayedCommand('yarn run build');

    elementContainsText('button', 'Run').click();

    goBack('Tasks');

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

    cy.get('button')
      .contains('Run')
      .click();

    cy.get('div.js-status-tests-failed', { timeout: 220000 }).contains(
      'failed'
    );

    cy.get('button')
      .contains('Cancel')
      .click();

    goBack('Tasks');
    clearAllRecentTasks();

    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', PASSING_TESTS);
  });

  it('runs serve task', () => {
    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);
    cy.writeFile('../../tmp/proj/src/app/app.component.spec.ts', PASSING_TESTS);

    clickOnTask('proj', 'serve');

    cy.get('div.context-title').contains('ng serve proj');

    clickOnFieldGroup('Optional fields');

    cy.get('input[name="port"]')
      .scrollIntoView()
      .clear()
      .type('9999');

    cy.get('button')
      .contains('Run')
      .click();

    cy.contains('button', 'Open App', { timeout: 220000 });

    cy.contains('.summary .content', 'Started', { timeout: 220000 });

    cy.contains('mat-grid-tile', /^.+\.js/);

    cy.get('button')
      .contains('Cancel')
      .click();

    goBack('Tasks');
    clearAllRecentTasks();

    cy.writeFile('../../tmp/proj/src/app/app.component.ts', GOOD_CMP);
  });

  it('runs custom tasks', () => {
    clickOnTask('proj', 'custom');

    cy.get('div.context-title').contains('ng run proj:custom');

    elementContainsText('button', 'Run').click();

    cy.wait(100);

    cy.get('button')
      .contains('Cancel')
      .click();

    goBack('Tasks');
  });
});
