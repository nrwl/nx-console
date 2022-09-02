import { X_COMPLETION_GLOB, X_COMPLETION_TYPE } from '@nx-console/json-schema';
import {
  configureJsonLanguageService,
  getJsonLanguageService,
  getLanguageModelCache,
} from '@nx-console/language-server/utils';
import { vol } from 'memfs';
import { ClientCapabilities, TextDocument } from 'vscode-json-languageservice';
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

const { document, jsonAst } = documentMapper.get(
  TextDocument.create(
    'file:///project.json',
    'json',
    0,
    `
{
  "fileCompletion": ""
}
    `
  )
);

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
  const matchingSchemas = await getJsonLanguageService().getMatchingSchemas(
    document,
    jsonAst,
    {
      type: 'object',
      properties: {
        fileCompletion: {
          type: 'string',
          [X_COMPLETION_TYPE]: 'file',
        } as any,
      },
    }
  );

  const items = await getCompletionItems(
    '/workspace',
    jsonAst,
    document,
    matchingSchemas,
    {
      line: 2,
      character: 21,
    }
  );

  expect(items.map((item) => item.label)).toMatchInlineSnapshot(`
    Array [
      "\\"file.js\\"",
      "\\"project/src/main.js\\"",
      "\\"project/src/main.ts\\"",
    ]
  `);
  expect(items.map((item) => item.detail)).toMatchInlineSnapshot(`
    Array [
      "/workspace/file.js",
      "/workspace/project/src/main.js",
      "/workspace/project/src/main.ts",
    ]
  `);
});

it('should be able to use a glob', async () => {
  const matchingSchemas = await getJsonLanguageService().getMatchingSchemas(
    document,
    jsonAst,
    {
      type: 'object',
      properties: {
        fileCompletion: {
          type: 'string',
          [X_COMPLETION_TYPE]: 'file',
          [X_COMPLETION_GLOB]: '*.ts',
        } as any,
      },
    }
  );

  const items = await getCompletionItems(
    '/workspace',
    jsonAst,
    document,
    matchingSchemas,
    {
      line: 2,
      character: 21,
    }
  );

  expect(items.map((item) => item.label)).toMatchInlineSnapshot(`
    Array [
      "\\"project/src/main.ts\\"",
    ]
  `);
});
