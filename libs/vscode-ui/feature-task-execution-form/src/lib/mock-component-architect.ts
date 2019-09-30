// import { Architect } from '../../../../schema/src/index';

export const MOCK_COMPONENT_ARCHITECT = {
  name: 'Component',
  project: 'Project',
  builder: 'Builder',
  description: 'Description',
  options: { defaultValues: [] },
  configurations: [],
  schema: [
    {
      name: 'inlineStyle',
      enum: null,
      type: 'boolean',
      description:
        'When true, includes styles inline in the component.ts file. Only CSS styles can be included inline. By default, an external styles file is created and referenced in the component.ts file.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'inlineTemplate',
      enum: null,
      type: 'boolean',
      description:
        'When true, includes template inline in the component.ts file. By default, an external template file is created and referenced in the component.ts file.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'viewEncapsulation',
      enum: ['Emulated', 'Native', 'None', 'ShadowDom'],
      type: 'enum',
      description:
        'The view encapsulation strategy to use in the new component.',
      defaultValue: null,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
      completionValues: {
        _isScalar: false,
        source: {
          source: {
            _isScalar: false,
            source: {
              _isScalar: false,
              source: { _isScalar: false },
              operator: { concurrent: 1 }
            },
            operator: {}
          }
        },
        operator: {
          connectable: {
            source: {
              _isScalar: false,
              source: {
                _isScalar: false,
                source: { _isScalar: false },
                operator: { concurrent: 1 }
              },
              operator: {}
            }
          }
        }
      }
    },
    {
      name: 'changeDetection',
      enum: ['Default', 'OnPush'],
      type: 'string',
      description: 'The change detection strategy to use in the new component.',
      defaultValue: 'Default',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
      completionValues: {
        _isScalar: false,
        source: {
          source: {
            _isScalar: false,
            source: {
              _isScalar: false,
              source: { _isScalar: false },
              operator: { concurrent: 1 }
            },
            operator: {}
          }
        },
        operator: {
          connectable: {
            source: {
              _isScalar: false,
              source: {
                _isScalar: false,
                source: { _isScalar: false },
                operator: { concurrent: 1 }
              },
              operator: {}
            }
          }
        }
      }
    },
    {
      name: 'prefix',
      enum: null,
      type: 'string',
      description: 'The prefix to apply to the generated component selector.',
      defaultValue: null,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'styleext',
      enum: null,
      type: 'string',
      description: 'The file extension to use for style files.',
      defaultValue: 'css',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'style',
      enum: ['css', 'scss', 'sass', 'less', 'styl'],
      type: 'string',
      description: 'The file extension or preprocessor to use for style files.',
      defaultValue: 'css',
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false,
      completionValues: {
        _isScalar: false,
        source: {
          source: {
            _isScalar: false,
            source: {
              _isScalar: false,
              source: { _isScalar: false },
              operator: { concurrent: 1 }
            },
            operator: {}
          }
        },
        operator: {
          connectable: {
            source: {
              _isScalar: false,
              source: {
                _isScalar: false,
                source: { _isScalar: false },
                operator: { concurrent: 1 }
              },
              operator: {}
            }
          }
        }
      }
    },
    {
      name: 'spec',
      enum: null,
      type: 'boolean',
      description:
        'When true (the default), generates a "spec.ts" test file for the new component.',
      defaultValue: true,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'skipTests',
      enum: null,
      type: 'boolean',
      description:
        'When true, does not create "spec.ts" test files for the new component.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'flat',
      enum: null,
      type: 'boolean',
      description:
        'When true, creates the new files at the top level of the current project.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'skipImport',
      enum: null,
      type: 'boolean',
      description:
        'When true, does not import this component into the owning NgModule.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'selector',
      enum: null,
      type: 'string',
      description: 'The HTML selector to use for this component.',
      defaultValue: null,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'entryComponent',
      enum: null,
      type: 'boolean',
      description:
        'When true, the new component is the entry component of the declaring NgModule.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    },
    {
      name: 'lintFix',
      enum: null,
      type: 'boolean',
      description:
        'When true, applies lint fixes after generating the component.',
      defaultValue: false,
      required: false,
      positional: false,
      __typename: 'Schema',
      important: false
    }
  ]
};
