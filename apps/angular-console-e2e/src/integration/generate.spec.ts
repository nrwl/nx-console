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
  uniqName
} from './utils';

describe('Generate', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
    openProject(projectPath('proj'));
    goToGenerate();
    cy.get('div.title').contains('Generate Code');
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
    cy.get('div.context-title').contains('Create an Angular service');

    const name = uniqName('example');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="project"]').type('proj');

    cy.wait(100);

    cy.get('button')
      .contains('Generate')
      .click();

    cy.wait(100);

    checkDisplayedCommand(
      `$ ng generate @schematics/angular:service ${name} --project=proj`
    );
    checkFileExists(`src/app/${name}.service.ts`);
    checkFileExists(`src/app/${name}.service.spec.ts`);

    goBack();

    cy.get('div.title').contains('Generate Code');
    taskListHeaders($p => {
      expect(texts($p)[0]).to.equal('@schematics/angular');
    });
  });
});
