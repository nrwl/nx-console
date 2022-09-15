import {
  configureJsonLanguageService,
  getJsonLanguageService,
  getLanguageModelCache,
} from '@nx-console/language-server/utils';
import {
  CompletionType,
  EnhancedJsonSchema,
  X_COMPLETION_GLOB,
  X_COMPLETION_TYPE,
} from '@nx-console/shared/json-schema';
import { vol } from 'memfs';
import {
  ClientCapabilities,
  Position,
  TextDocument,
} from 'vscode-json-languageservice';
import { getCompletionItems } from './get-completion-items';

// eslint-disable-next-line @typescript-eslint/no-var-requires
jest.mock('fs', () => require('memfs').fs);

configureJsonLanguageService(
  {
    clientCapabilities: ClientCapabilities.LATEST,
  },
  {}
);
const documentMapper = getLanguageModelCache();

const getTestCompletionItemsFor = async (
  text: string,
  schema: EnhancedJsonSchema | undefined
) => {
  const offset = text.indexOf('|');
  text = text.substr(0, offset) + text.substr(offset + 1);

  const { document, jsonAst } = documentMapper.retrieve(
    TextDocument.create('file:///project.json', 'json', 0, text)
  );

  const matchingSchemas = await getJsonLanguageService().getMatchingSchemas(
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
          [X_COMPLETION_TYPE]: CompletionType.file,
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
          [X_COMPLETION_TYPE]: CompletionType.file,
          [X_COMPLETION_GLOB]: '*.ts',
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

it('should return ');
