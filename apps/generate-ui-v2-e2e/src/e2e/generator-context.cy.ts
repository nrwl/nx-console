import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { getFieldByName } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';

const schemaProj: GeneratorSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    {
      name: 'project',
      isRequired: true,
      aliases: [],
      items: ['project1', 'project2', 'project3'],
    },
  ],
  context: {
    project: 'project3',
    directory: 'nested/nested2',
    prefillValues: {
      project: 'project3',
    },
  },
};

describe('generator context', () => {
  it('should correctly use the context to prefill values', () => {
    visitGenerateUi(schemaProj);
    getFieldByName('project').should('have.value', 'project3');

    spyOnConsoleLog().then((consoleLog) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--project=project3');
    });
  });

  const schemaFixed: GeneratorSchema = {
    collectionName: '@nx/test',
    generatorName: 'test',
    description: 'description',
    options: [
      {
        name: 'project',
        isRequired: false,
        aliases: [],
        items: ['project1', 'project2', 'project3'],
      },
    ],
    context: {
      fixedFormValues: {
        sample: 'value',
      },
    },
  };
  it('should use fixed form value and use them to construct the generate command', () => {
    visitGenerateUi(schemaFixed);
    spyOnConsoleLog().then((consoleLog) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--sample=value');
    });
  });
});
