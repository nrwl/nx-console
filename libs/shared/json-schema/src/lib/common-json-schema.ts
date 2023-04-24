import { JSONSchema } from 'vscode-json-languageservice';
import { CompletionType } from './completion-type';
import { NxVersion } from '@nx-console/shared/types';

export const implicitDependencies: JSONSchema = {
  type: 'array',
  items: {
    type: 'string',
    'x-completion-type': CompletionType.projects,
  },
};

export const outputs: JSONSchema = {
  type: 'array',
  items: {
    type: 'string',
    'x-completion-type': CompletionType.directory,
  },
};

export const inputs: JSONSchema[] = [
  { type: 'string', 'x-completion-type': CompletionType.inputNameWithDeps },
  {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        'x-completion-type': CompletionType.inputName,
      },
      projects: {
        type: 'string',
        enum: ['self', 'dependencies'],
      },
    },
  },
  {
    type: 'object',
    properties: {
      fileset: {
        type: 'string',
      },
    },
  },
  {
    type: 'object',
    properties: {
      runtime: {
        type: 'string',
      },
    },
  },
  {
    type: 'object',
    properties: {
      env: {
        type: 'string',
      },
    },
  },
];

export const namedInputs: JSONSchema = {
  type: 'object',
  additionalProperties: {
    oneOf: inputs,
  },
};

export const tags: JSONSchema = {
  type: 'array',
  items: {
    type: 'string',
    'x-completion-type': CompletionType.tags,
  },
};

export const targets = (
  nxVersion: NxVersion,
  executors?: JSONSchema[]
): JSONSchema => {
  let projects: JSONSchema = {};
  if (nxVersion.major < 16) {
    projects = {
      type: 'string',
      enum: ['self', 'dependencies'],
    };
  } else {
    projects = {
      oneOf: [
        {
          type: 'string',
          'x-completion-type': CompletionType.projectWithDeps,
        },
        {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.projectWithDeps,
          },
        },
      ],
    };
  }

  const schema: JSONSchema = {
    additionalProperties: {
      type: 'object',
      properties: {
        outputs,
        ...(executors && { executor: { type: 'string' } }),
        ...(executors && {
          configurations: { additionalProperties: { type: 'object' } },
        }),
        dependsOn: {
          type: 'array',
          items: {
            oneOf: [
              {
                type: 'string',
                'x-completion-type': CompletionType.targetsWithDeps,
              },
              {
                type: 'object',
                properties: {
                  projects,
                  target: {
                    type: 'string',
                    'x-completion-type': CompletionType.targets,
                  },
                  params: {
                    type: 'string',
                    enum: ['ignore', 'forward'],
                  },
                },
              },
            ],
          },
        },
        inputs: {
          type: 'array',
          items: {
            oneOf: inputs,
          },
        },
      },
      ...(executors && { allOf: executors }),
    },
  };

  return schema;
};
