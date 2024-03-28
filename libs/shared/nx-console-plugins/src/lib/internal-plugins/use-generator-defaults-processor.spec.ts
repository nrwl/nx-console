import { NxWorkspace } from '@nx-console/shared/types';
import { useGeneratorDefaultsProcessor } from './use-generator-defaults-processor';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
const mockLogger = {
  log: (value: string) => {
    // noop
  },
};
const defaultSchema: GeneratorSchema = {
  collectionName: 'my-collection',
  generatorName: 'my-generator',
  options: [
    {
      name: 'option1',
      default: 'default1',
      aliases: [],
      isRequired: false,
    },
    {
      name: 'option2',
      default: 'default2',
      aliases: [],
      isRequired: false,
    },
  ],
  description: '',
};

describe('useGeneratorDefaultsProcessor', () => {
  it('should update options with default values from nx.json - nested', () => {
    const workspace = {
      workspace: {
        generators: {
          'my-collection': {
            'my-generator': {
              option1: 'updated-default1',
              option2: 'updated-default2',
            },
          },
        },
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      defaultSchema,
      workspace as any as NxWorkspace,
      mockLogger
    );

    expect(processedSchema.options).toEqual([
      {
        name: 'option1',
        default: 'updated-default1',
        aliases: [],
        isRequired: false,
      },
      {
        name: 'option2',
        default: 'updated-default2',
        aliases: [],
        isRequired: false,
      },
    ]);
  });

  it('should update options with default values from nx.json - flat', () => {
    const workspace = {
      workspace: {
        generators: {
          'my-collection:my-generator': {
            option1: 'updated-default1',
            option2: 'updated-default2',
          },
        },
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      defaultSchema,
      workspace as any as NxWorkspace,
      mockLogger
    );

    expect(processedSchema.options).toEqual([
      {
        name: 'option1',
        default: 'updated-default1',
        aliases: [],
        isRequired: false,
      },
      {
        name: 'option2',
        default: 'updated-default2',
        aliases: [],
        isRequired: false,
      },
    ]);
  });

  it('should return the original schema if nx.json entry is not found', () => {
    const workspace = {
      workspace: {
        generators: {},
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      defaultSchema,
      workspace as any as NxWorkspace,
      mockLogger
    );

    expect(processedSchema).toEqual(defaultSchema);
  });
});
