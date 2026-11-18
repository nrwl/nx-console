import { MigrateSidebarViewProvider } from './migrate-sidebar-view-provider';

jest.mock(
  'vscode',
  () => ({
    Uri: {
      joinPath: (base: { path: string }, ...parts: string[]) => ({
        path: [base.path, ...parts].join('/'),
      }),
    },
    Disposable: class {
      constructor(private callback: () => void) {}
      dispose() {
        this.callback();
      }
    },
    commands: { executeCommand: jest.fn() },
    window: { registerWebviewViewProvider: jest.fn() },
  }),
  { virtual: true },
);
jest.mock('@nx-console/vscode-output-channels', () => ({
  vscodeLogger: { log: jest.fn() },
}));
jest.mock('./commands/start-migration', () => ({ startMigration: jest.fn() }));
jest.mock('./git-extension/view-diff', () => ({
  viewPackageJsonDiff: jest.fn(),
}));
jest.mock('./commands/migrate-commands', () => ({
  cancelMigration: jest.fn(),
  confirmPackageChanges: jest.fn(),
}));

const breakout = `'"><img src=x onerror="alert(1)"><script>alert(2)</script>`;

function render(context: unknown) {
  const actor = {
    getSnapshot: () => ({ value: { 'in-progress': 'default' }, context }),
    subscribe: () => ({ unsubscribe: jest.fn() }),
    send: jest.fn(),
  };
  const provider = new MigrateSidebarViewProvider(
    {
      extensionUri: { path: '/extension' },
      subscriptions: [],
    } as any,
    actor as any,
  );
  const webview = {
    options: {},
    html: '',
    cspSource: 'vscode-webview://test',
    asWebviewUri: (uri: { path: string }) => `vscode-webview://test${uri.path}`,
    onDidReceiveMessage: jest.fn(),
  };
  provider.resolveWebviewView(
    {
      webview,
      visible: false,
      badge: undefined,
      onDidDispose: jest.fn(),
      onDidChangeVisibility: jest.fn(),
    } as any,
    {} as any,
    {} as any,
  );
  return webview.html;
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function rootElementAttributes(html: string): Record<string, string> {
  const rootElements = html.match(/<root-element[^>]*>/g);
  expect(rootElements).toHaveLength(1);
  const attributes: Record<string, string> = {};
  const rest = rootElements![0]
    .replace(/^<root-element/, '')
    .replace(/>$/, '')
    .replace(/\s+([a-zA-Z]+)="([^"<>']*)"/g, (_, name, value) => {
      attributes[name] = decodeHtmlAttribute(value);
      return '';
    });
  // nothing outside the two double-quoted attributes
  expect(rest.trim()).toBe('');
  return attributes;
}

describe('MigrateSidebarViewProvider', () => {
  const migrateViewData = {
    currentNxVersion: { major: 20, minor: 0, full: '20.0.0' },
    latestNxVersion: { major: 21, minor: 0, full: '21.0.0' },
    migrationsJsonSection: {
      initialGitRef: { ref: breakout, subject: breakout },
      confirmedPackageUpdates: false,
    },
  };

  it('passes migrations.json data to the webview as inert attributes', () => {
    const html = render(migrateViewData);
    const attributes = rootElementAttributes(html);

    expect(Object.keys(attributes)).toEqual(['state', 'migrateViewData']);
    expect(JSON.parse(attributes.migrateViewData)).toEqual(migrateViewData);
    expect(JSON.parse(attributes.state)).toEqual({ 'in-progress': 'default' });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>alert');
  });

  it('sets a Content Security Policy that blocks inline scripts', () => {
    const html = render(migrateViewData);
    const csp = html.match(
      /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/,
    )?.[1];

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('script-src vscode-webview://test;');
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
