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
  waitForActionToComplete,
  whitelistGraphql
} from './utils';
import { clearRecentTask } from './tasks.utils';

describe('Generate Workspace Schematics', () => {
  beforeEach(() => {
    whitelistGraphql();
    openProject(projectPath('proj-nx'));
    goToGenerate();
    cy.get('div.title').contains('Generate Code');
  });

  it('runs a schematic', () => {
    clickOnTask('@nrwl/schematics', 'workspace-schematic');
    cy.get('div.context-title').contains(
      '@nrwl/schematics - workspace-schematic'
    );

    const schematicName = uniqName('schematic-name');
    cy.get('input[name="name"]').type(schematicName);

    cy.wait(100);

    cy.get('button')
      .contains('Generate')
      .click();

    cy.wait(100);

    checkDisplayedCommand(
      `ng generate @nrwl/schematics:workspace-schematic ${schematicName}`
    );

    cy.wait(5000);
    checkFileExists(`tools/schematics/${schematicName}/schema.json`, 'proj-nx');

    openProject(projectPath('proj-nx'));
    goToGenerate();

    cy.get('div.title').contains('Generate Code');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('Workspace Schematics');
    });

    clickOnTask('Workspace Schematics', schematicName);
    cy.get('div.context-title').contains(
      `Workspace Schematics - ${schematicName}`
    );

    const libName = uniqName('lib-name');
    cy.get('input[name="name"]').type(libName);

    cy.wait(100);

    cy.get('button')
      .contains('Generate')
      .click();

    cy.wait(15000);
    checkFileExists(`libs/${libName}/tsconfig.json`, 'proj-nx');
  });

  after(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj-nx'));
    clearRecentTask();
  });
});
