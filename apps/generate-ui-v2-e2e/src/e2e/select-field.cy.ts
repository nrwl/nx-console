import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { getFieldByName } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';

const textOptions = ['author', 'category', 'directory', 'owner', 'prefix'].map(
  (name) => ({
    name,
    aliases: [],
    isRequired: false,
    'x-priority': 'important' as const,
  }),
);

const selectSchema: GeneratorSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    ...textOptions,
    {
      name: 'unitTestRunner',
      items: ['vitest', 'jest', 'none'],
      aliases: [],
      isRequired: false,
      'x-priority': 'important',
    },
  ],
};

const expectListInsideViewport = (name: string) =>
  cy.window().then((win) => {
    const select = win.document.querySelector(`[id="${name}-field"]`);
    const listbox = select?.shadowRoot?.querySelector('.listbox');
    const rect = listbox?.getBoundingClientRect();
    expect(rect?.height ?? 0).to.be.greaterThan(0);
    expect(rect?.top ?? -1).to.be.at.least(0);
    expect(rect?.bottom ?? Infinity).to.be.at.most(win.innerHeight);
  });

describe('select field', () => {
  beforeEach(() => {
    cy.viewport(1000, 500);
    visitGenerateUi(selectSchema);
  });

  it('opens above when the field is at the bottom of the form', () => {
    getFieldByName('unitTestRunner').then(($select) => {
      $select[0].scrollIntoView({ block: 'end' });
    });
    getFieldByName('unitTestRunner').click();

    getFieldByName('unitTestRunner').should('have.attr', 'position', 'above');
    expectListInsideViewport('unitTestRunner');

    cy.get('[id="unitTestRunner-field"] intellij-option[value="none"]')
      .should('be.visible')
      .click();
    getFieldByName('unitTestRunner').should('have.prop', 'value', 'none');

    spyOnConsoleLog().then((consoleLog: any) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--unitTestRunner=none');
    });
  });
});
