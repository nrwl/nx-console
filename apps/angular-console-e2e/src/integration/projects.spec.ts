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

    cy.contains('button.mat-stroked-button', 'Generate')
      .first()
      .click();
    cy.get('#filter-schematics', { timeout: 500 }).type('com');
    cy.contains('angular-console-filter-menu button', 'component').click();
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
    cy.contains('angular-console-projects button', 'Lint');
    cy.contains('angular-console-projects button', 'E2e');
    cy.contains('angular-console-projects button', 'Extract-i18n');
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
    cy.contains('div.context-title', 'ng run proj:extract-i18n');
    cy.get('.exit-action').click();

    cy.contains('button.mat-stroked-button', 'Lint')
      .first()
      .click();
    cy.contains('div.context-title', 'ng lint proj');
    cy.get('.exit-action').click();

    cy.contains('angular-console-projects button', 'Component').should(
      'not.exist'
    );
  });
  it('should pin and unpin projects', () => {
    cy.get('mat-icon.favorite-icon.favorited').should('not.exist');
    cy.get('mat-icon.favorite-icon:not(.favorited)')
      .should('have.length', 2)
      .first()
      .click();
    cy.get('mat-icon.favorite-icon:not(.favorited)').should('have.length', 1);
    cy.get('mat-icon.favorite-icon.favorited')
      .should('have.length', 1)
      .click();
    cy.get('mat-icon.favorite-icon.favorited').should('not.exist');
    cy.get('mat-icon.favorite-icon:not(.favorited)').should('have.length', 2);
  });
});
