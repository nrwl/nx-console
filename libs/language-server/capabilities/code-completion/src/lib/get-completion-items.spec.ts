import { configureJsonLanguageService } from '@nx-console/language-server/utils';
import {
  CompletionType,
  EnhancedJsonSchema,
} from '@nx-console/shared/json-schema';
import * as workspace from '@nx-console/language-server/workspace';
import { vol } from 'memfs';
import {
  ClientCapabilities,
  Position,
  TextDocument,
} from 'vscode-json-languageservice';
import { getCompletionItems } from './get-completion-items';
import { NxWorkspace } from '@nx-console/shared/types';

jest.mock(
  '@nx-console/language-server/workspace',
  (): Partial<typeof workspace> => ({
    nxWorkspace: jest.fn(() =>
      Promise.resolve<NxWorkspace>({
        configurationFilePath: '/workspace.json',
        isLerna: false,
        validWorkspaceJson: true,
        workspaceType: 'nx',
        workspacePath: '/',
        workspaceLayout: {
          appsDir: '',
          libsDir: '',
        },
        workspace: {
          version: 2,
          projects: {
            project1: {
              root: 'apps/project1',
              tags: ['tag1'],
              targets: {
                build: {
                  executor: 'noop',
                },
                test: {
                  executor: 'noop',
                },
              },
            },
            project2: {
              root: 'apps/project2',
              tags: ['tag2', 'tag3'],
              targets: {
                build: {
                  executor: 'noop',
                  configurations: {
                    production: {},
                  },
                },
                test: {
                  executor: 'noop',
                },
                lint: {
                  executor: 'noop',
                },
              },
            },
          },
        },
      })
    ),
  })
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
jest.mock('fs', () => require('memfs').fs);

const languageService = configureJsonLanguageService(
  {
    clientCapabilities: ClientCapabilities.LATEST,
  },
  {}
);

describe('getCompletionItems', () => {
  const getTestCompletionItemsFor = async (
    text: string,
    schema?: EnhancedJsonSchema
  ) => {
    const offset = text.indexOf('|');
    text = text.substr(0, offset) + text.substr(offset + 1);

    const document = TextDocument.create(
      'file:///project.json',
      'json',
      0,
      text
    );
    const jsonAst = languageService.parseJSONDocument(document);
    const matchingSchemas = await languageService.getMatchingSchemas(
      document,
      jsonAst,
      schema
    );

    const items = await getCompletionItems(
      '/workspace',
      jsonAst,
      document,
      matchingSchemas,
      Position.create(0, offset)
    );

    return {
      labels: items.map((item) => item.label),
      details: items.map((item) => item.detail),
    };
  };

  beforeEach(() => {
    vol.fromNestedJSON({
      '/workspace': {
        'file.js': 'content',
        './project/src': {
          'main.ts': 'content',
          'main.js': 'content',
        },
      },
    });
  });

  afterAll(() => {
    vol.reset();
  });

  it('should return all completion items without a glob', async () => {
    const { labels, details } = await getTestCompletionItemsFor(
      `{"fileCompletion": "|"}`,
      {
        type: 'object',
        properties: {
          fileCompletion: {
            type: 'string',
            'x-completion-type': CompletionType.file,
          },
        },
      }
    );

    expect(labels).toMatchInlineSnapshot(`
          Array [
            "\\"file.js\\"",
            "\\"project/src/main.js\\"",
            "\\"project/src/main.ts\\"",
          ]
      `);
    expect(details).toMatchInlineSnapshot(`
          Array [
            "/workspace/file.js",
            "/workspace/project/src/main.js",
            "/workspace/project/src/main.ts",
          ]
      `);
  });

  it('should be able to use a glob', async () => {
    const { labels } = await getTestCompletionItemsFor(
      `{"fileCompletion": "|"}`,
      {
        type: 'object',
        properties: {
          fileCompletion: {
            type: 'string',
            'x-completion-type': CompletionType.file,
            'x-completion-glob': '*.ts',
          },
        },
      }
    );

    expect(labels).toMatchInlineSnapshot(`
          Array [
            "\\"project/src/main.ts\\"",
          ]
      `);
  });

  describe('tags', () => {
    const tagSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.tags,
          },
        },
      },
    };

    it('should return tags', async () => {
      const { labels } = await getTestCompletionItemsFor(
        `{"tags": ["|"]}`,
        tagSchema
      );
      expect(labels).toMatchInlineSnapshot(`
              Array [
                "\\"tag1\\"",
                "\\"tag2\\"",
                "\\"tag3\\"",
              ]
          `);
    });

    it('should filter tags that already exist on the property', async () => {
      const { labels } = await getTestCompletionItemsFor(
        `{"tags": ["tag1", "|"]}`,
        tagSchema
      );
      expect(labels).toMatchInlineSnapshot(`
              Array [
                "\\"tag2\\"",
                "\\"tag3\\"",
              ]
          `);
    });
  });

  describe('projects', () => {
    const projectSchema = {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.projects,
          },
        },
      },
    };
    it('should return projects', async () => {
      const { labels } = await getTestCompletionItemsFor(
        `{"projects": ["|"]}`,
        projectSchema
      );
      expect(labels).toMatchInlineSnapshot(`
              Array [
                "\\"project1\\"",
                "\\"!project1\\"",
                "\\"project2\\"",
                "\\"!project2\\"",
              ]
          `);
    });
  });

  describe('targets', () => {
    const targetSchema = {
      type: 'object',
      properties: {
        targets: {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.targets,
          },
        },
        targetsWithDeps: {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.targetsWithDeps,
          },
        },
      },
    };

    it('should return targets', async () => {
      const { labels } = await getTestCompletionItemsFor(
        `{"targets": ["|"]}`,
        targetSchema
      );
      expect(labels).toMatchInlineSnapshot(`
              Array [
                "\\"build\\"",
                "\\"test\\"",
                "\\"lint\\"",
              ]
          `);
    });

    it('should return targets', async () => {
      const { labels } = await getTestCompletionItemsFor(
        `{"targetsWithDeps": ["|"]}`,
        targetSchema
      );
      expect(labels).toMatchInlineSnapshot(`
        Array [
          "\\"^build\\"",
          "\\"build\\"",
          "\\"^test\\"",
          "\\"test\\"",
          "\\"^lint\\"",
          "\\"lint\\"",
        ]
      `);
    });
  });

  describe('project with targets', () => {
    const projectWithTargetsSchema = {
      type: 'object',
      properties: {
        targets: {
          type: 'array',
          items: {
            type: 'string',
            'x-completion-type': CompletionType.projectTarget,
          },
        },
      },
    };

    it('should return targets', async () => {
      const { labels } = await getTestCompletionItemsFor(
        `{"targets": ["|"]}`,
        projectWithTargetsSchema
      );
      expect(labels).toMatchInlineSnapshot(`
        Array [
          "\\"project1:build\\"",
          "\\"project1:test\\"",
          "\\"project2:build\\"",
          "\\"project2:build:production\\"",
          "\\"project2:test\\"",
          "\\"project2:lint\\"",
        ]
      `);
    });
  });
});
