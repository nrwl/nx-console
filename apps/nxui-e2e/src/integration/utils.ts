import * as path from 'path';

export function clickOnFieldGroup(group: string) {
  cy.get('mat-expansion-panel-header')
    .contains(group)
    .click();
}

export function checkError(error: string) {
  cy.get('simple-snack-bar').contains(error);
}

export function goBack() {
  cy.get('mat-icon')
    .contains('clear')
    .click();
}

export function expandTerminal() {
  cy.get('button')
    .contains('Show')
    .click();
}

export function toggleBoolean(field: string) {
  fieldOperation(field, el => {
    el.querySelector('div.boolean-ripple').click();
  });
}

export function checkButtonIsDisabled(text: string, disabled: boolean) {
  cy.get('button').should($p => {
    for (let i = 0; i < $p.length; ++i) {
      if ($p[i].innerText.indexOf(text) > -1) {
        expect($p[i].hasAttribute('disabled')).to.equal(disabled);
      }
    }
  });
}

export function checkFieldHasClass(
  field: string,
  hasClass: boolean,
  className: string
) {
  fieldOperation(field, el => {
    if (hasClass) {
      expect(el.className).to.contain(className);
    } else {
      expect(el.className).not.to.contain(className);
    }
  });
}

function fieldOperation(field: string, operation: (el: any) => void) {
  cy.get('div.field').should($p => {
    for (let i = 0; i < $p.length; ++i) {
      if ($p[i].querySelector(`[name="${field}"]`)) {
        operation($p[i]);
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
  cy.get('.mat-tab-link:nth-of-type(3)').click();
  waitForAnimation();
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

export function tasks(callback: (s: any) => void) {
  cy.get('mat-nav-list.task-list').within(() => {
    cy.root()
      .find('mat-list-item')
      .should(callback);
  });
}

export function clickOnTask(group: string, name: string) {
  cy.get('mat-nav-list.task-list').should(($p: any) => {
    const children = $p.get()[0].children;
    let insideGroup = false;
    for (let i = 0; i < children.length; ++i) {
      const c = children[i];
      if (c.className.indexOf('collection-name') > -1) {
        insideGroup = c.innerText.trim() === group;
      }
      if (insideGroup && c.innerText.trim() === name) {
        c.click();
      }
    }
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

export function projectPath(name: string) {
  return path.join(Cypress.env('projectsRoot'), name);
}
