import * as path from 'path';

export function clickOnFieldGroup(group: string) {
  cy.get('mat-expansion-panel-header')
    .contains(group)
    .click();
}

export function checkMessage(error: string) {
  cy.get('simple-snack-bar').contains(error);
}

export function goBack() {
  cy.get('mat-icon')
    .contains('clear')
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

export function openProject(proj: string) {
  // TODO: Create a directory autocomplete bar and re-enable below logic.
  // cy.get('.mat-tab-link:nth-of-type(3)').click();
  // waitForAnimation();
  // cy.get('input').type(p);
  // cy.get('button#open-workspace').click();
  cy.visit(`workspace/${encodeURIComponent(proj)}/projects`);
}

export function projectNames(callback: (s: any) => void) {
  cy.get('.project-name').should(callback);
}

export function goToGenerate() {
  cy.get('button#go-to-generate').click();
  waitForAnimation();
}

export function goToExtensions() {
  cy.get('button#go-to-extensions').click();
  waitForAnimation();
}

export function goToTasks() {
  cy.get('button#go-to-tasks').click();
  waitForAnimation();
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

export function clickOnTask(
  group: string,
  name: string,
  exact: boolean = true
) {
  cy.get('mat-nav-list.task-list').should(($p: any) => {
    const children = $p.get()[0].children;
    let insideGroup = false;
    for (let i = 0; i < children.length; ++i) {
      const c = children[i];
      if (c.className.indexOf('collection-name') > -1) {
        insideGroup = c.innerText.trim() === group;
      }
      if (
        insideGroup &&
        (exact
          ? c.innerText.trim() === name
          : c.innerText.trim().indexOf(name) > -1)
      ) {
        c.click();
      }
    }
  });
  waitForAnimation();
}

export function expandFolder(name: string) {
  cy.get('button.directory').should(($p: any) => {
    let found = false;
    for (let i = 0; i < $p.length; ++i) {
      if ($p[i].innerText.indexOf(name) > -1) {
        found = true;
        $p[i].querySelector('mat-icon.expand-icon').click();
      }
    }

    if (!found) {
      throw new Error(`Didn't find ${name}`);
    }
  });
}

export function selectFolder(name: string) {
  cy.get('button.directory').should(($p: any) => {
    let found = false;

    for (let i = 0; i < $p.length; ++i) {
      if ($p[i].innerText.indexOf(name) > -1) {
        found = true;
        $p[i].click();
      }
    }

    if (!found) {
      throw new Error(`Didn't find ${name}`);
    }
  });
}

export function waitForAnimation() {
  cy.wait(400);
}

export function waitForAutocomplete() {
  cy.wait(700);
}

export function waitForNgNew() {
  cy.wait(120000);
}

export function waitForActionToComplete() {
  cy.wait(100); // this is to give the app time ot disable the button first
  cy.get('button.action-button:enabled[color="primary"]', {
    timeout: 120000
  }).should($p => {
    expect($p.length).to.equal(1);
  });
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
  return `${prefix}${Math.floor(Math.random() * 100000)}`;
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
