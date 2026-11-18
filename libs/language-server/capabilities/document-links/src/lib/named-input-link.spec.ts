import {
  configureJsonLanguageService,
  getLanguageModelCache,
} from '@nx-console/language-server-utils';
import {
  CompletionType,
  X_COMPLETION_TYPE,
} from '@nx-console/shared-json-schema';
import { readNxJson } from '@nx-console/shared-npm';
import { vol } from 'memfs';
import { TextDocument } from 'vscode-json-languageservice';
import {
  getProjectNamedInputDefinition,
  namedInputLink,
} from './named-input-link';

jest.mock('@nx-console/shared-npm', () => ({ readNxJson: jest.fn() }));
jest.mock('fs', () => jest.requireActual('memfs').fs);

const languageService = configureJsonLanguageService({}, {});
const workspaceJson = {
  namedInputs: { default: [], production: [] },
  targetDefaults: { build: { inputs: ['production'] } },
};

beforeEach(() => {
  vol.fromJSON({
    '/workspace/nx.json': JSON.stringify(workspaceJson, null, 2),
  });
  jest.mocked(readNxJson).mockResolvedValue(workspaceJson);
});

afterAll(() => {
  vol.reset();
  getLanguageModelCache().dispose();
});

async function link(file: string, config: object, input: string) {
  const uri = `file:///workspace/${file}`;
  const text = JSON.stringify(config, null, 2);
  const document = TextDocument.create(uri, 'json', 0, text);
  const ast = languageService.parseJSONDocument(document);
  const node = ast.getNodeFromOffset(
    text.lastIndexOf(JSON.stringify(input)) + 1,
  );
  if (!node) {
    throw new Error('Missing fixture input');
  }
  return namedInputLink('/workspace', node, document);
}

const project = {
  namedInputs: { production: [], localOnly: [] },
  targets: {
    build: { inputs: ['production', 'localOnly', 'default', '^production'] },
  },
};

it('links an overridden name and a local-only name to project.json', async () => {
  expect(await link('apps/child/project.json', project, 'production')).toBe(
    'file:///workspace/apps/child/project.json#3',
  );
  expect(await link('apps/child/project.json', project, 'localOnly')).toBe(
    'file:///workspace/apps/child/project.json#4',
  );
  expect(readNxJson).not.toHaveBeenCalled();
});

it('links an overridden name to the nx key in package.json', async () => {
  expect(
    await link(
      'packages/pkg/package.json',
      {
        namedInputs: { production: [] },
        nx: project,
      },
      'production',
    ),
  ).toBe('file:///workspace/packages/pkg/package.json#7');
});

it('falls back to nx.json for a workspace-only input', async () => {
  expect(await link('project.json', project, 'default')).toBe(
    'file:///workspace/nx.json#3',
  );
});

it('keeps workspace navigation in targetDefaults', async () => {
  expect(await link('nx.json', workspaceJson, 'production')).toBe(
    'file:///workspace/nx.json#4',
  );
});

it('leaves dependency inputs without a declaration link', async () => {
  expect(await link('project.json', project, '^production')).toBeUndefined();
});

it('returns an exact definition range for a local input reference', async () => {
  languageService.configure({
    schemas: [
      {
        uri: 'https://example.test/project-schema.json',
        fileMatch: ['project.json'],
        schema: {
          properties: {
            inputs: {
              type: 'array',
              items: {
                type: 'string',
                [X_COMPLETION_TYPE]: CompletionType.inputNameWithDeps,
              },
            },
          },
        },
      },
    ],
  });
  const document = TextDocument.create(
    'file:///workspace/project.json',
    'json',
    0,
    [
      '{',
      '  "name": "production",',
      '  "namedInputs": { "production": [] },',
      '  "inputs": ["production", "^production"]',
      '}',
    ].join('\n'),
  );
  const ast = languageService.parseJSONDocument(document);

  expect(
    await getProjectNamedInputDefinition(document, ast, {
      line: 3,
      character: 16,
    }),
  ).toEqual([
    {
      targetUri: document.uri,
      targetRange: {
        start: { line: 2, character: 19 },
        end: { line: 2, character: 35 },
      },
      targetSelectionRange: {
        start: { line: 2, character: 19 },
        end: { line: 2, character: 31 },
      },
      originSelectionRange: {
        start: { line: 3, character: 13 },
        end: { line: 3, character: 25 },
      },
    },
  ]);
  for (const position of [
    { line: 1, character: 15 },
    { line: 3, character: 31 },
  ]) {
    expect(
      await getProjectNamedInputDefinition(document, ast, position),
    ).toBeUndefined();
  }
});
