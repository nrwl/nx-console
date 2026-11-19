import { getLanguageModelCache } from '@nx-console/language-server-utils';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { getLanguageService, TextDocument } from 'vscode-json-languageservice';
import { targetsCompletion } from './targets-completion';

jest.mock('@nx-console/shared-nx-workspace-info', () => ({
  nxWorkspace: jest.fn(),
}));

const languageService = getLanguageService({});
afterAll(() => getLanguageModelCache().dispose());

beforeEach(() => {
  jest.mocked(nxWorkspace).mockResolvedValue({
    daemonEnabled: false,
    validWorkspaceJson: true,
    nxJson: {},
    projectGraph: {
      nodes: {
        app: {
          name: 'app',
          type: 'app',
          data: { root: 'apps/app', targets: { test: {}, build: {} } },
        },
      },
      dependencies: {},
    },
    isLerna: false,
    nxVersion: { major: 24, minor: 0, full: '24.0.6' },
    isEncapsulatedNx: false,
    workspaceLayout: { appsDir: 'apps', libsDir: 'libs' },
    workspacePath: '/workspace',
  });
});

async function labels(dependsOn: unknown[], withDependencies = true) {
  const text = JSON.stringify({ dependsOn });
  const document = TextDocument.create(
    'file:///workspace/project.json',
    'json',
    0,
    text,
  );
  const ast = languageService.parseJSONDocument(document);
  const node = ast.getNodeFromOffset(text.indexOf('"cursor"') + 1);
  if (!node) {
    throw new Error('Missing fixture target');
  }
  return (
    await targetsCompletion('/workspace', node, document, withDependencies)
  ).map(({ label }) => JSON.parse(label));
}

it('keeps dependency targets when the plain target is present', async () => {
  expect(await labels(['test', 'cursor'])).toEqual([
    '^test',
    '^build',
    'build',
  ]);
});

it('keeps plain targets when the dependency target is present', async () => {
  expect(await labels(['^test', 'cursor'])).toEqual([
    'test',
    '^build',
    'build',
  ]);
});

it('filters both exact entries when both are present', async () => {
  expect(await labels(['test', '^test', 'cursor'])).toEqual([
    '^build',
    'build',
  ]);
});

it('filters exact targets without offering dependency variants', async () => {
  expect(await labels(['test', 'cursor'], false)).toEqual(['build']);
});

it('offers plain targets inside dependency objects', async () => {
  expect(
    await labels([{ target: 'cursor', dependencies: true }], false),
  ).toEqual(['test', 'build']);
});
