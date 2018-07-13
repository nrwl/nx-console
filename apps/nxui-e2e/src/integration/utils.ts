import * as path from 'path';

export function clickOnFieldGroup(group: string) {
  cy.get('mat-expansion-panel-header')
    .contains(group)
    .click();
}

export function checkFieldError(field: string, hasError: boolean) {
  cy.get('div.field').should($p => {
    for (let i = 0; i < $p.length; ++i) {
      if ($p[i].querySelector(`[name="${field}"]`)) {
        if (hasError) {
          expect($p[i].className).to.contain('error');
        }
      }
    }
  });
}

export function checkDisplayedCommand(s: string) {
  cy.get('div.command').should($p => {
    const t = texts($p);
    expect(t.length).to.equal(1);
    expect(t[0]).to.equal(s);
  });
}

export function openProject(p: string) {
  cy.get('input').type(p);
  cy.get('button#open-workspace').click();
}

export function projectNames(callback: (s: any) => void) {
  cy.get('div.projects')
    .find('h3')
    .should(callback);
}

export function goToGenerate() {
  cy.get('button#go-to-generate').click();
}

export function goToTasks() {
  cy.get('button#go-to-tasks').click();
}

export function taskListHeaders(callback: (s: any) => void) {
  cy.get('mat-nav-list.task-list').within(() => {
    cy.root()
      .find('h3.mat-subheader')
      .should(callback);
  });
}

export function clickOnTask(name: string) {
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

export function waitForAnimation() {
  cy.wait(300);
}

export function waitForAutocomplete() {
  cy.wait(400);
}
export function waitForBuild() {
  cy.wait(10000);
}

export function autocompletion(callback: (s: any) => void) {
  cy.get('div.mat-autocomplete-panel').within(() => {
    cy.root()
      .find('mat-option')
      .should(callback);
  });
}

export function checkFileExists(f: string) {
  return cy.readFile(path.join('./../../tmp/proj/', f));
}

export function uniqName(prefix: string): string {
  return `${prefix}-${Math.floor(Math.random() * 100000)}`;
}

export function els($p: any): any {
  return $p.map((i, el) => Cypress.$(el));
}

export function texts($p: any): string[] {
  return els($p)
    .map((i, el) => el.text())
    .toArray();
}

export function projectPath() {
  return path.join(Cypress.env('projectsRoot'), 'proj');
}
