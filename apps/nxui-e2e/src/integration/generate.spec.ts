import * as path from 'path';
import {
  autocompletion,
  clickOnTask,
  els,
  checkFileExists,
  goToGenerate,
  openProject,
  projectNames,
  projectPath,
  taskListHeaders,
  texts,
  uniqName,
  waitForAnimation,
  waitForAutocomplete,
  checkDisplayedCommand
} from './utils';

describe('Generate', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
  });

  it('runs a schematic', () => {
    openProject(projectPath());
    goToGenerate();

    taskListHeaders($p => {
      expect(
        texts($p).filter(r => r === '@schematics/angular').length
      ).to.equal(1);
    });
    clickOnTask('service');
    waitForAnimation();

    const name = uniqName('example');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="project"]').type('pro');
    waitForAutocomplete();
    autocompletion($p => {
      els($p)[0].click();
    });

    cy.wait(200);

    cy.get('button')
      .contains('Generate')
      .click();

    cy.wait(100);

    checkDisplayedCommand(`$ ng generate service ${name} --project=proj`);
    checkFileExists(`src/app/${name}.service.ts`);
    checkFileExists(`src/app/${name}.service.spec.ts`);
  });
});
