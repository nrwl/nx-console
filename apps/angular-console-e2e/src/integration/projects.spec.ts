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
    cy.contains('button.mat-stroked-button', 'Run')
      .first()
      .click();
    cy.contains('button.route-button', 'build');
    cy.contains('button.route-button', 'serve');
    cy.contains('button.route-button', 'test');
    cy.contains('button.route-button', 'lint');
    cy.contains('button.route-button', 'extract-i18n');
    cy.contains('button.route-button', 'custom');
    cy.contains('button.route-button', 'build')
      .first()
      .click();
    cy.contains('div.context-title', 'ng build proj');
    cy.get('.exit-action').click();
    cy.contains('button.mat-stroked-button', 'Run')
      .first()
      .click();
    cy.contains('button.route-button', 'serve').click();
    cy.contains('div.context-title', 'ng serve proj');
    cy.get('.exit-action').click();
    cy.contains('button.mat-stroked-button', 'Run')
      .first()
      .click();
    cy.contains('button.route-button', 'extract-i18n').click();
    cy.contains('div.context-title', 'ng run proj:extract-i18n');
    cy.get('.exit-action').click();

    cy.contains('button.mat-stroked-button', 'Run')
      .first()
      .click();
    cy.contains('button.route-button', 'lint').click();
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
