import { getLanguageModelCache } from '@nx-console/language-server-utils';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { getLanguageService, TextDocument } from 'vscode-json-languageservice';
import { inputNameCompletion } from './input-name-completion';

jest.mock('@nx-console/shared-nx-workspace-info', () => ({
  nxWorkspace: jest.fn(),
}));

const languageService = getLanguageService({});
afterAll(() => getLanguageModelCache().dispose());

beforeEach(() => {
  jest.mocked(nxWorkspace).mockResolvedValue({
    daemonEnabled: false,
    validWorkspaceJson: true,
    nxJson: { namedInputs: { default: [], production: [] } },
    projectGraph: { nodes: {}, dependencies: {} },
    isLerna: false,
    nxVersion: { major: 24, minor: 0, full: '24.0.6' },
    isEncapsulatedNx: false,
    workspaceLayout: { appsDir: 'apps', libsDir: 'libs' },
    workspacePath: '/workspace',
  });
});

async function labels(file: string, text: string, withDependencies = true) {
  const document = TextDocument.create(
    `file:///workspace/${file}`,
    'json',
    0,
    text,
  );
  const ast = languageService.parseJSONDocument(document);
  const input = ast.getNodeFromOffset(text.indexOf('"cursor"') + 1);
  if (!input) {
    throw new Error('Missing fixture input');
  }
  return (
    await inputNameCompletion('/workspace', input, document, withDependencies)
  )
    .map(({ label }) => JSON.parse(label))
    .sort();
}

const project = {
  namedInputs: { localOnly: [], production: [] },
  targets: { build: { inputs: ['cursor'] } },
};

it.each([
  ['apps/child/project.json', project],
  ['packages/pkg/package.json', { nx: project }],
  ['package.json', { nx: project }],
])('includes project and workspace inputs once in %s', async (file, config) => {
  expect(await labels(file, JSON.stringify(config))).toEqual([
    '^default',
    '^production',
    'default',
    'localOnly',
    'production',
  ]);
});

it('offers only unprefixed inputs when dependency variants are disabled', async () => {
  expect(await labels('project.json', JSON.stringify(project), false)).toEqual([
    'default',
    'localOnly',
    'production',
  ]);
});

it('uses workspace inputs for target defaults', async () => {
  expect(
    await labels(
      'nx.json',
      JSON.stringify({
        targetDefaults: project.targets,
        unrelated: { namedInputs: project.namedInputs },
      }),
    ),
  ).toEqual(['^default', '^production', 'default', 'production']);
});

it('only reads named inputs from the nx key in package.json', async () => {
  expect(
    await labels(
      'package.json',
      JSON.stringify({
        namedInputs: { ignored: [] },
        other: { nx: { namedInputs: { alsoIgnored: [] } } },
        nx: { targets: project.targets },
      }),
    ),
  ).toEqual(['^default', '^production', 'default', 'production']);
});
