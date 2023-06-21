import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { clickShowMore, getFieldByName } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

const schema: GeneratorSchema = {
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
    { name: 'directory', isRequired: false, aliases: [] },
  ],
  context: {
    project: 'project3',
    directory: 'nested/nested2',
  },
};
describe('generator context', () => {
  beforeEach(() => visitGenerateUi(schema));
  it('should correctly use the context', () => {
    clickShowMore();

    getFieldByName('project').should('have.value', 'project3');
    getFieldByName('directory').should('have.value', 'nested/nested2');

    spyOnConsoleLog().then((consoleLog) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--project=project3');
      expectConsoleLogToHaveBeenCalledWith(
        consoleLog,
        '--directory=nested/nested2'
      );
    });
  });
});
