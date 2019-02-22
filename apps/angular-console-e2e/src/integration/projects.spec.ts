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
    elementContainsText('button', 'Generate Component').click();
    elementContainsText('div.context-title', '@schematics/angular - component');
    cy.get('input[name="project"]').should(($p: any) => {
      expect($p[0].value).to.equal('proj');
    });
  });

  it('provides navigation to and from command runners', () => {
    cy.contains('Generate Component').click();
    cy.get('.exit-action').click();

    projectNames($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
  });
  it('should pin and unpin projects', () => {
    cy.get('.favorite-icon.favorited').should('not.exist');
    cy.get('.favorite-icon:not(.favorited)')
      .should('have.length', 2)
      .first()
      .click();
    cy.get('.favorite-icon:not(.favorited)').should('have.length', 1);
    cy.get('.favorite-icon.favorited')
      .should('have.length', 1)
      .click();
    cy.get('.favorite-icon.favorited').should('not.exist');
    cy.get('.favorite-icon:not(.favorited)').should('have.length', 2);
  });
});
