import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import {
  expectConsoleLogToHaveBeenCalledWith,
  spyOnConsoleLog,
} from '../support/console-spy';
import { getFieldByName } from '../support/get-elements';
import { visitGenerateUi } from '../support/visit-generate-ui';

const schemaWithDefaultTrue: GeneratorSchema = {
  collectionName: '@nx/test',
  generatorName: 'test',
  description: 'description',
  options: [
    {
      name: 'component',
      type: 'boolean',
      default: true,
      aliases: [],
      isRequired: false,
    },
  ],
};

const schemaWithDefaultFalse: GeneratorSchema = {
  ...schemaWithDefaultTrue,
  options: [
    {
      ...schemaWithDefaultTrue.options[0],
      default: false,
    },
  ],
};

describe('boolean defaults', () => {
  it('should send --component=false when default true is unchecked', () => {
    visitGenerateUi(schemaWithDefaultTrue);
    getFieldByName('component').then((field) => {
      expect((field.get(0) as HTMLInputElement).checked).to.eq(true);
    });

    getFieldByName('component').click();
    getFieldByName('component').then((field) => {
      expect((field.get(0) as HTMLInputElement).checked).to.eq(false);
    });

    spyOnConsoleLog().then((consoleLog: any) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');
      expectConsoleLogToHaveBeenCalledWith(consoleLog, '--component=false');
    });
  });

  it('should keep false defaults as default values', () => {
    visitGenerateUi(schemaWithDefaultFalse);
    getFieldByName('component').then((field) => {
      expect((field.get(0) as HTMLInputElement).checked).to.eq(false);
    });

    spyOnConsoleLog().then((consoleLog: any) => {
      cy.get("[data-cy='generate-button']").click();
      expectConsoleLogToHaveBeenCalledWith(consoleLog, 'run-generator');

      cy.get('@consoleLog').then(() => {
        const emittedComponentFlag = consoleLog.getCalls().some((call) => {
          const args = Array.from(call.args);
          return args.some((arg) =>
            JSON.stringify(arg).includes('--component='),
          );
        });
        expect(emittedComponentFlag).to.eq(false);
      });
    });
  });
});
