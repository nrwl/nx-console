import * as path from 'path';

xdescribe('Regular CLI', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
  });

  it('show details screen', () => {
    cy.get('input').type(projectPath());
    cy.get('button').click();

    cy.contains('Name: proj');

    cy
      .get('ul.projects')
      .find('li')
      .should($p => {
        expect($p.length).to.equal(2);
        expect(texts($p)[0]).to.contain('proj');
        expect(texts($p)[1]).to.contain('proj-e2e');
      });
  });

  it('runs a schematic', () => {
    cy.get('input').type(projectPath());
    cy.get('button').click();
    cy.get('button#go-to-generate').click();

    cy.get('mat-selection-list.task-list').within(() => {
      cy
        .root()
        .find('div.collection-name')
        .should($p => {
          expect($p.length).to.equal(1);
          expect(texts($p)[0]).to.contain('@schematics/angular');
        });

      cy
        .root()
        .find('mat-list-option')
        .should($p => {
          const serviceSchematic = els($p).filter(
            (i, f) => f.text().indexOf('service') > -1
          )[0];
          serviceSchematic.click();
        });
    });

    const name = uniqName('example');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="project"]').type('proj');
    cy.wait(200);

    cy.get('button#action').click();

    fileExists(`src/app/${name}.service.ts`);
    fileExists(`src/app/${name}.service.spec.ts`);
  });
});

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
  return els($p).map((i, el) => el.text());
}

export function projectPath() {
  return path.join(Cypress.env('projectsRoot'), 'proj');
}
