import {
  checkDisplayedCommand,
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

describe('Project with local collection', () => {
  beforeEach(() => {
    whitelistGraphql();
    cy.visit('/workspaces');
    openProject(projectPath('proj-local-collection'));
    goToGenerate();
    cy.get('div.title').contains('Generate Code');
  });

  it('shows the local schematics', () => {
    taskListHeaders($p => {
      expect($p.length).to.equal(3);
      expect(texts($p)[0]).to.equal('.proj-local-collection');
    });

    tasks($p => {
      const t = texts($p);
      expect(t.indexOf('my-full-schematic') > -1).to.equal(true);
    });
  });

  it('runs a local schematic', () => {
    clickOnTask('.proj-local-collection', 'my-full-schematic');
    cy.get('div.context-title').contains(
      'A schematic using a source and a schema to validate options'
    );

    const name = uniqName('example');
    cy.get('input[name="name"]').type(name);

    cy.wait(100);

    cy.get('button')
      .contains('Generate')
      .click();

    cy.wait(100);

    checkDisplayedCommand(`$ ng generate .:my-full-schematic --name=${name}`);
    cy.readFile('./../../tmp/proj-local-collection/hola');
    cy.readFile('./../../tmp/proj-local-collection/allo');

    goBack();

    cy.get('div.title').contains('Generate Code');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('.proj-local-collection');
    });
  });

  after(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj-local-collection'));
    clearRecentTask();
  });
});
