import * as path from 'path';

describe('Basic Tests', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
  });

  it('shows details screen', () => {
    openProject(projectPath());

    cy.contains('Name: proj');

    projectNames($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
  });

  it('runs a schematic', () => {
    openProject(projectPath());
    openGenerate();

    taskListHeaders($p => {
      expect(
        texts($p).filter(r => r === '@schematics/angular').length
      ).to.equal(1);
    });
    clickOnTask('service');
    waitForAnimation();

    const name = uniqName('example');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="project"]').type('e2e');

    autocompletion($p => {
      expect($p.length).to.equal(1);
      expect(texts($p)[0]).to.contain('proj-e2e');
    });

    cy.get('input[name="project"]').clear();
    cy.get('input[name="project"]').type('proj');
    waitForAutocomplete();

    autocompletion($p => {
      els($p)[0].click();
    });

    cy.wait(200);

    cy.get('button')
      .contains('Generate')
      .click();

    fileExists(`src/app/${name}.service.ts`);
    fileExists(`src/app/${name}.service.spec.ts`);
  });
});

function openProject(p: string) {
  cy.get('input').type(p);
  cy.get('button#open-workspace').click();
}

function projectNames(callback: (s: any) => void) {
  cy.get('div.projects')
    .find('h3')
    .should(callback);
}

function openGenerate() {
  cy.get('button#go-to-generate').click();
}

function taskListHeaders(callback: (s: any) => void) {
  cy.get('mat-nav-list.task-list').within(() => {
    cy.root()
      .find('h3.mat-subheader')
      .should(callback);
  });
}

function clickOnTask(name: string) {
  cy.get('mat-nav-list.task-list').within(() => {
    cy.root()
      .find('mat-list-item')
      .should($p => {
        const serviceSchematic = els($p).filter(
          (i, f) => f.text().indexOf(name) > -1
        )[0];
        serviceSchematic.click();
      });
  });
}

function waitForAnimation() {
  cy.wait(300);
}

function waitForAutocomplete() {
  cy.wait(400);
}

function autocompletion(callback: (s: any) => void) {
  cy.get('div.mat-autocomplete-panel').within(() => {
    cy.root()
      .find('mat-option')
      .should(callback);
  });
}

function fileExists(f: string) {
  return cy.readFile(path.join('./../../tmp/proj/', f));
}

function uniqName(prefix: string): string {
  return `${prefix}-${Math.floor(Math.random() * 100000)}`;
}

function els($p: any): any {
  return $p.map((i, el) => Cypress.$(el));
}

function texts($p: any): string[] {
  return els($p)
    .map((i, el) => el.text())
    .toArray();
}

export function projectPath() {
  return path.join(Cypress.env('projectsRoot'), 'proj');
}
