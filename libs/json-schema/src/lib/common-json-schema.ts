import { JSONSchema } from 'vscode-json-languageservice';

export const implicitDependencies: JSONSchema = {
  type: 'array',
  items: {
    type: 'string',
    'x-completion-type': 'project',
  },
};

export const outputs: JSONSchema = {
  type: 'array',
  items: {
    type: 'string',
    'x-completion-type': 'directory',
  },
};

export const inputs: JSONSchema[] = [
  { type: 'string' },
  {
    type: 'object',
    properties: {
      input: {
        type: 'string',
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
    'x-completion-type': 'tags',
  },
};

export const targets = (executors?: JSONSchema[]): JSONSchema => {
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
                'x-completion-type': 'targets',
              },
              {
                type: 'object',
                properties: {
                  projects: {
                    type: 'string',
                    enum: ['self', 'dependencies'],
                  },
                  target: {
                    type: 'string',
                    'x-completion-type': 'targets',
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
