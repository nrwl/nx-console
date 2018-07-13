import { openProject, projectNames, projectPath, texts } from './utils';

describe('Details', () => {
  beforeEach(() => {
    cy.visit('/workspaces');
  });

  it('shows details screen', () => {
    openProject(projectPath());

    cy.contains('Name: proj');

    projectNames($p => {
      expect($p.length).to.equal(2);
      expect(texts($p)[0]).to.contain('proj');
      expect(texts($p)[1]).to.contain('proj-e2e');
    });
  });
});
