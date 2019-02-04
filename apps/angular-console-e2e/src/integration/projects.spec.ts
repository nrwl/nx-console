import {
  openWorkspace,
  projectNames,
  projectPath,
  texts,
  whitelistGraphql
} from './utils';

describe('Projects', () => {
  beforeEach(() => {
    whitelistGraphql();
    openWorkspace(projectPath('proj'));
    cy.contains('div.title', 'Projects');
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
    cy.contains('button', 'Generate Component').click();
    cy.contains('div.context-title', '@schematics/angular - component');
    cy.get('input[name="project"]').should(($p: any) => {
      expect($p[0].value).to.equal('proj');
    });
  });

  // TODO: Re-enable when we app routes back to projects page
  xit('provides navigation to and from command runners', () => {
    cy.contains('Generate Component').click();
    cy.get('.exit-action').click();

    projectNames($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
  });
});
