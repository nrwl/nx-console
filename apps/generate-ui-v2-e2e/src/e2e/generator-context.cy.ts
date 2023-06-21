import { visitGenerateUi } from '../support/visit-generate-ui';
import { schema } from '../support/test-schema';

describe('generator context', () => {
  beforeEach(() => visitGenerateUi(schema));
  it('should display the context', () => {
    cy.get('*').should('exist');
  });
});
