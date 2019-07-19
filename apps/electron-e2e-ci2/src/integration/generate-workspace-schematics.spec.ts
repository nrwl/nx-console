import {
  checkDisplayedCommand,
  checkFileExists,
  clickOnTask,
  elementContainsText,
  goToGenerate,
  openWorkspace,
  projectPath,
  taskListHeaders,
  texts,
  uniqName,
  whitelistGraphql
} from '@angular-console/cypress';

describe('Generate Workspace Schematics', () => {
  beforeEach(() => {
    whitelistGraphql();
    openWorkspace(projectPath('proj-nx'), 'generate');
  });

  it('runs a schematic', () => {
    clickOnTask('@nrwl/schematics', 'workspace-schematic');
    elementContainsText(
      'div.context-title',
      '@nrwl/schematics - workspace-schematic'
    );

    const schematicName = uniqName('schematic-name');
    cy.get('input[name="name"]').type(schematicName);

    cy.wait(100);

    elementContainsText('button', 'Generate').click();

    cy.wait(100);

    checkDisplayedCommand(
      `ng generate @nrwl/schematics:workspace-schematic ${schematicName}`
    );

    checkFileExists(
      `tools/schematics/${schematicName}/schema.json`,
      'proj-nx',
      { timeout: 5000 }
    );

    openWorkspace(projectPath('proj-nx'));
    goToGenerate();

    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('Workspace Schematics');
    });

    clickOnTask('Workspace Schematics', schematicName);
    elementContainsText(
      'div.context-title',
      `Workspace Schematics - ${schematicName}`
    );

    const libName = uniqName('lib-name');
    cy.get('input[name="name"]').type(libName);

    elementContainsText('button', 'Generate').click();

    checkFileExists(`libs/${libName}/tsconfig.json`, 'proj-nx', {
      timeout: 15000
    });
  });
});
