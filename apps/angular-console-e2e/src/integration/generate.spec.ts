import {
  checkDisplayedCommand,
  checkFileExists,
  clickOnTask,
  goBack,
  goToGenerate,
  openProject,
  projectPath,
  taskListHeaders,
  tasks,
  texts,
  uniqName,
  whitelistGraphql
} from './utils';
import { clearRecentTask } from './tasks.utils';

describe('Generate', () => {
  beforeEach(() => {
    whitelistGraphql();
    openProject(projectPath('proj'));
    goToGenerate();
    cy.contains('div.title', 'Generate');
  });

  it('filters schematics', () => {
    taskListHeaders($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.equal('@schematics/angular');
    });

    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('service') > -1).to.equal(true);
      expect(t.indexOf('component') > -1).to.equal(true);
    });

    // filter by item
    cy.get('input#filter').type('servi');
    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('service') > -1).to.equal(true);
      expect(t.indexOf('component') > -1).to.equal(false);
    });

    // filter by collection
    cy.get('input#filter').clear();
    cy.get('input#filter').type('angular');
    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('service') > -1).to.equal(true);
      expect(t.indexOf('component') > -1).to.equal(true);
    });
  });

  it('runs a schematic', () => {
    clickOnTask('@schematics/angular', 'service');
    cy.contains('div.context-title', '@schematics/angular - service');

    const name = uniqName('example');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="project"]').type('proj{esc}');

    cy.contains('Optional fields').click();
    cy.get('mat-select[name="flat"]')
      .contains('false')
      .click();
    cy.contains('mat-option', 'true').click();
    cy.get('mat-select[name="flat"]').contains('true');

    cy.contains('button', 'Generate').click();

    checkDisplayedCommand(
      `ng generate @schematics/angular:service ${name} --project=proj --flat`
    );
    checkFileExists(`src/app/${name}.service.ts`);
    checkFileExists(`src/app/${name}.service.spec.ts`);

    goBack();

    cy.contains('div.title', 'Generate');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('@schematics/angular');
    });
  });

  after(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj'));
    clearRecentTask();
  });
});
