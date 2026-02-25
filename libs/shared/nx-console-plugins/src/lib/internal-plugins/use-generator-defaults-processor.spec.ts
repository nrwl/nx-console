import { NxWorkspace } from '@nx-console/shared-types';
import { useGeneratorDefaultsProcessor } from './use-generator-defaults-processor';
import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
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
      nxJson: {
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
      mockLogger,
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
      nxJson: {
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
      mockLogger,
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
      nxJson: {
        generators: {},
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      defaultSchema,
      workspace as any as NxWorkspace,
      mockLogger,
    );

    expect(processedSchema).toEqual(defaultSchema);
  });

  it('should allow overriding boolean defaults to false - nested', () => {
    const schema: GeneratorSchema = {
      collectionName: '@nx/react',
      generatorName: 'library',
      description: '',
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
    const workspace = {
      nxJson: {
        generators: {
          '@nx/react': {
            library: {
              component: false,
            },
          },
        },
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      schema,
      workspace as any as NxWorkspace,
      mockLogger,
    );

    expect(processedSchema.options).toEqual([
      {
        name: 'component',
        type: 'boolean',
        default: false,
        aliases: [],
        isRequired: false,
      },
    ]);
  });

  it('should allow overriding boolean defaults to false - flat', () => {
    const schema: GeneratorSchema = {
      collectionName: '@nx/react',
      generatorName: 'library',
      description: '',
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
    const workspace = {
      nxJson: {
        generators: {
          '@nx/react:library': {
            component: false,
          },
        },
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      schema,
      workspace as any as NxWorkspace,
      mockLogger,
    );

    expect(processedSchema.options).toEqual([
      {
        name: 'component',
        type: 'boolean',
        default: false,
        aliases: [],
        isRequired: false,
      },
    ]);
  });

  it('should keep falsy defaults like empty string and zero', () => {
    const workspace = {
      nxJson: {
        generators: {
          'my-collection': {
            'my-generator': {
              option1: '',
              option2: 0,
            },
          },
        },
      },
    };

    const processedSchema = useGeneratorDefaultsProcessor(
      defaultSchema,
      workspace as any as NxWorkspace,
      mockLogger,
    );

    expect(processedSchema.options).toEqual([
      {
        name: 'option1',
        default: '',
        aliases: [],
        isRequired: false,
      },
      {
        name: 'option2',
        default: 0,
        aliases: [],
        isRequired: false,
      },
    ]);
  });
});
