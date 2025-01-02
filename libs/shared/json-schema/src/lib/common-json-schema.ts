import { JSONSchema } from 'vscode-json-languageservice';
import { CompletionType } from './completion-type';
import { NxVersion } from '@nx-console/nx-version';
import { gte } from '@nx-console/nx-version';

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

export const inputs = (nxVersion: NxVersion): JSONSchema[] => [
  { type: 'string', 'x-completion-type': CompletionType.inputNameWithDeps },
  {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        'x-completion-type': CompletionType.inputName,
      },
      projects: projects(nxVersion),
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

export const namedInputs = (nxVersion: NxVersion): JSONSchema => ({
  type: 'object',
  additionalProperties: {
    type: 'array',
    items: {
      oneOf: inputs(nxVersion),
    },
  },
});

export const tags: JSONSchema = {
  type: 'array',
  items: {
    type: 'string',
    'x-completion-type': CompletionType.tags,
  },
};

const projects = (nxVersion: NxVersion): JSONSchema => {
  if (!gte(nxVersion, '16.0.0')) {
    return {
      type: 'string',
      enum: ['self', 'dependencies'],
    };
  } else {
    return {
      oneOf: [
        {
          type: 'string',
          'x-completion-type': CompletionType.projects,
        },
        {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.projects,
          },
        },
      ],
    };
  }
};

export const targets = (
  nxVersion: NxVersion,
  executors?: JSONSchema[]
): JSONSchema => {
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
                  projects: projects(nxVersion),
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
            oneOf: inputs(nxVersion),
          },
        },
      },
      ...(executors && { allOf: executors }),
    },
  };

  return schema;
};
