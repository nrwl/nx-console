import {
  checkDisplayedCommand,
  checkFileExists,
  clickOnTask,
  goToGenerate,
  openProject,
  projectPath,
  taskListHeaders,
  texts,
  uniqName,
  whitelistGraphql
} from './utils';
import { clearRecentTask } from './tasks.utils';

describe('Generate Workspace Schematics', () => {
  beforeEach(() => {
    whitelistGraphql();
    openProject(projectPath('proj-nx'));
    goToGenerate();
    cy.contains('div.title', 'Generate');
  });

  it('runs a schematic', () => {
    clickOnTask('@nrwl/schematics', 'workspace-schematic');
    cy.contains('div.context-title', '@nrwl/schematics - workspace-schematic');

    const schematicName = uniqName('schematic-name');
    cy.get('input[name="name"]').type(schematicName);

    cy.wait(100);

    cy.contains('button', 'Generate').click();

    cy.wait(100);

    checkDisplayedCommand(
      `ng generate @nrwl/schematics:workspace-schematic ${schematicName}`
    );

    checkFileExists(
      `tools/schematics/${schematicName}/schema.json`,
      'proj-nx',
      { timeout: 5000 }
    );

    openProject(projectPath('proj-nx'));
    goToGenerate();

    cy.contains('div.title', 'Generate');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('Workspace Schematics');
    });

    clickOnTask('Workspace Schematics', schematicName);
    cy.contains('div.context-title', `Workspace Schematics - ${schematicName}`);

    const libName = uniqName('lib-name');
    cy.get('input[name="name"]').type(libName);

    cy.contains('button', 'Generate').click();

    checkFileExists(`libs/${libName}/tsconfig.json`, 'proj-nx', {
      timeout: 15000
    });
  });

  after(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj-nx'));
    clearRecentTask();
  });
});
