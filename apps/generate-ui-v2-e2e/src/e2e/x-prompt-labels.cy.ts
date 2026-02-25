import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { getFieldByName } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';
import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';

const itemTooltips = {
  da: 'Data Access',
  f: 'Feature',
  s: 'State Management',
};

const labelsSchema: GeneratorSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    {
      name: 'type',
      isRequired: true,
      aliases: [],
      items: ['da', 'f', 's'],
      itemTooltips,
    },
    {
      name: 'scope',
      type: 'array',
      aliases: [],
      isRequired: false,
      items: ['da', 'f', 's'],
      itemTooltips,
      'x-priority': 'important',
    },
  ],
};

describe('x-prompt labels', () => {
  beforeEach(() => visitGenerateUi(labelsSchema));

  it('shows labels in select field and submits raw value', () => {
    cy.get('[id="type-field"] option[value="da"]').should(
      'contain.text',
      'Data Access',
    );
    getFieldByName('type').select('da');

    spyOnConsoleLog().then((consoleLog: any) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--type=da');
    });
  });

  it('shows labels in multiselect field and submits raw value', () => {
    cy.get('[id="scope-field"] option[value="f"]').should(
      'contain.text',
      'Feature',
    );
    getFieldByName('scope').select('f');
    cy.get('[data-cy="scope-field-item"]').should('contain.text', 'Feature');

    spyOnConsoleLog().then((consoleLog: any) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--scope=f');
    });
  });
});
