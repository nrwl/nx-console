import {
  openWorkspace,
  projectNames,
  projectPath,
  texts,
  whitelistGraphql,
  elementContainsText
} from '../support/utils';

describe('Projects', () => {
  beforeEach(() => {
    whitelistGraphql();
    openWorkspace(projectPath('proj'));
    elementContainsText('div.title', 'Projects');
  });

  it('shows projects screen', () => {
    cy.contains('proj');

    projectNames($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
  });

  it('checks that hot actions work', () => {
    cy.contains('angular-console-projects button', 'Component').should(
      'not.exist'
    );

    cy.contains('mat-icon', 'more_horiz')
      .first()
      .click();
    cy.contains('.cdk-overlay-pane button', 'Component').click();
    cy.contains('div.context-title', '@schematics/angular - component');
    cy.get('input[name="project"]').should(($p: any) => {
      expect($p[0].value).to.equal('proj');
    });
    cy.get('.exit-action').click();

    projectNames($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
    cy.contains('angular-console-projects button', 'Component');

    cy.contains('angular-console-projects button', 'Build')
      .first()
      .click();
    cy.contains('div.context-title', 'ng build proj');
    cy.get('.exit-action').click();
    cy.contains('angular-console-projects button', 'Serve')
      .first()
      .click();
    cy.contains('div.context-title', 'ng serve proj');
    cy.get('.exit-action').click();
    cy.contains('angular-console-projects button', 'Extract-i18n')
      .first()
      .click();
    cy.contains('div.context-title', 'ng extract-i18n proj');
    cy.get('.exit-action').click();
    cy.contains('angular-console-projects button', 'Test')
      .first()
      .click();
    cy.contains('div.context-title', 'ng test proj');
    cy.get('.exit-action').click();
    cy.contains('mat-icon', 'more_horiz')
      .first()
      .click();
    cy.contains('.cdk-overlay-pane button', 'Lint').click();
    cy.contains('div.context-title', 'ng lint proj');
    cy.get('.exit-action').click();

    cy.contains('angular-console-projects button', 'Component').should(
      'not.exist'
    );
  });
});
