import { getPDVData } from '@nx-console/vscode-nx-workspace';
import { window } from 'vscode';
import { NewProjectDetailsPreview } from './new-project-details-preview';

jest.mock('@nx-console/vscode-configuration', () => ({
  getNxWorkspacePath: () => '/workspace',
}));
jest.mock('@nx-console/vscode-graph-base', () => ({}));
jest.mock('@nx-console/vscode-lsp-client', () => ({
  onWorkspaceRefreshed: jest.fn(),
}));
jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getPDVData: jest.fn(),
  getProjectByPath: async () => undefined,
}));
jest.mock('@nx-console/vscode-project-graph', () => ({}));
jest.mock('@nx-console/vscode-utils', () => ({
  escapeScriptTag: (value: string) => value,
  escapeJsString: (value: string) => value,
}));
jest.mock('vscode', () => ({
  window: { createWebviewPanel: jest.fn() },
  Uri: { file: (path: string) => path },
  ViewColumn: { Beside: 2 },
}));

describe('Project Details errors', () => {
  it.each([undefined, '[{"message":"Current graph failure"}]'])(
    'renders a missing-project message with current errors %s',
    async (errorsSerialized) => {
      const webview = {
        html: '',
        onDidReceiveMessage: jest.fn(),
        asWebviewUri: (path: string) => path,
      };
      jest.mocked(window.createWebviewPanel).mockReturnValue({
        webview,
        onDidChangeViewState: jest.fn(),
        onDidDispose: jest.fn(),
      } as never);
      jest.mocked(getPDVData).mockResolvedValue({
        resultType: 'ERROR',
        graphBasePath: '/graph',
        errorMessage: 'No project found at apps/hello/project.json',
        errorsSerialized,
        pdvDataSerialized: undefined,
        pdvDataSerializedMulti: undefined,
      });
      new NewProjectDetailsPreview('/workspace/apps/hello/project.json', {
        extensionUri: '/extension',
      } as never);
      await new Promise(setImmediate);
      expect(webview.html).toContain('window.renderError');
      expect(webview.html).toContain(
        'No project found at apps/hello/project.json',
      );
      expect(webview.html).toContain(`errors: ${errorsSerialized ?? '[]'}`);
    },
  );
});
