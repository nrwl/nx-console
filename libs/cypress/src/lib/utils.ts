import * as path from 'path';

export function whitelistGraphql() {
  cy.server({
    whitelist: xhr => {
      if (xhr.url.indexOf('graphql') !== -1) {
        return true;
      }
      // this function receives the xhr object in question and
      // will whitelist if it's a GET that appears to be a static resource
      return (
        xhr.method === 'GET' &&
        /\.(jsx?|html|css|svg|png|jpg)(\?.*)?$/.test(xhr.url)
      );
    }
  });
}

export function clickOnFieldGroup(group: string) {
  elementContainsText('mat-expansion-panel-header', group).click();
}

export function checkMessage(error: string) {
  cy.get('simple-snack-bar').contains(error);
}

export function goBack(expectedTitle: string) {
  elementContainsText('mat-icon', 'clear').click();
  elementContainsText('div.title', expectedTitle);
}

export function checkButtonIsDisabled(text: string, disabled: boolean) {
  cy.get('button', { timeout: 2000 }).should(($p: any) => {
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

export function checkDisplayedCommand(s: string, timeout: number = 3000) {
  elementContainsText('div.command.window-header', s, timeout);
}

export function openWorkspace(proj: string, route: string = 'projects') {
  cy.visit(`workspace/${encodeURIComponent(proj)}/${route}`);
  elementContainsText(
    'div.title',
    route.slice(0, 1).toUpperCase() + route.slice(1)
  );
}

export function projectNames(callback: (s: any) => void) {
  cy.get('.project-name').should(callback);
}

export function goToGenerate() {
  cy.get('button#go-to-generate').click({ force: true, timeout: 5000 });
  elementContainsText('ui-contextual-action-bar .title', 'Generate', 5000);
}

export function goToExtensions() {
  cy.get('button#go-to-extensions').click({ force: true, timeout: 5000 });
  elementContainsText('ui-contextual-action-bar .title', 'Extensions');
}

export function goToTasks() {
  cy.get('button#go-to-tasks').click({ force: true, timeout: 5000 });
  elementContainsText('ui-contextual-action-bar .title', 'Tasks');
}

export function taskListHeaders(callback: (s: any) => void) {
  cy.get('mat-nav-list.task-list', { timeout: 5000 }).within(() => {
    cy.root()
      .find('h3.mat-subheader', { timeout: 5000 })
      .should(callback);
  });
}

export function tasks(callback: (s: any) => void) {
  cy.get('mat-nav-list.task-list', { timeout: 5000 }).within(() => {
    cy.root()
      .find('mat-list-item', { timeout: 5000 })
      .should(callback);
  });
}

export function clickOnTask(
  group: string,
  name: string,
  exact: boolean = true
) {
  cy.get('mat-nav-list.task-list', { timeout: 5000 }).should(($p: any) => {
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
        break;
      }
    }
  });
}

export function selectFolder() {
  cy.wait(300);
  cy.get('.path-form-field input').click();
  cy.get('.js-step-name-workspace').click();
  cy.wait(500);
}

export function waitForActionToComplete() {
  cy.get('button.action-button').should('be.disabled');
  cy.get('button.action-button:enabled[color="primary"]', {
    timeout: 120000
  }).should('have.length', 1);
}

export function autocompletion(callback: (s: any) => void) {
  cy.get('div.mat-autocomplete-panel').within(() => {
    cy.root()
      .find('mat-option', { timeout: 3000 })
      .should(callback);
  });
}

export function elementContainsText(
  selector: string,
  text: string,
  timeout: number = 3000
) {
  return cy.contains(selector, text, { timeout });
}

export function checkFileExists(
  f: string,
  projName: string = 'proj',
  options?: Partial<Cypress.Timeoutable & Cypress.Loggable>
) {
  return cy.readFile(path.join(`./../../tmp/${projName}/`, f), options);
}

export function uniqName(prefix: string): string {
  return `${prefix}${Math.floor(Math.random() * 100000)}`;
}

export function els($p: any): any {
  return $p.map((_: any, el: any) => Cypress.$(el));
}

export function texts($p: any): string[] {
  return els($p)
    .map((_: any, el: any) => el.text())
    .toArray();
}

export function projectPath(name: string) {
  return path.join(Cypress.env('projectsRoot'), name);
}
