import { URI } from 'vscode-uri';
import { join } from 'path';
import { getUriForError } from './get-uri-for-error';

jest.mock('vscode', () => ({
  Uri: URI,
}));

describe('getUriForError', () => {
  it('repro: URI.parse throws for "my path:config.json" but getUriForError does not', () => {
    expect(() => URI.parse('my path:config.json')).toThrow(
      'Scheme contains illegal characters',
    );

    const error = { file: 'my path:config.json' };
    const workspacePath = '';
    const uri = getUriForError(error, workspacePath);
    expect(uri.scheme).toBe('file');
    expect(uri.fsPath).toContain('my path');
  });

  it('returns file URI for error.file with normal path', () => {
    const error = { file: 'libs/foo/project.json' };
    const uri = getUriForError(error, '/workspace');
    expect(uri.scheme).toBe('file');
    expect(uri.fsPath).toBe(join('/workspace', 'libs/foo/project.json'));
  });

  it('returns workspace path when no error.file and no nx.json or lerna.json', () => {
    const error = {};
    const uri = getUriForError(error, '/tmp/nonexistent-workspace-xyz');
    expect(uri.scheme).toBe('file');
    expect(uri.fsPath).toContain('nonexistent-workspace-xyz');
  });

  it('handles empty workspacePath with error.file', () => {
    const error = { file: 'nx.json' };
    const uri = getUriForError(error, '');
    expect(uri.scheme).toBe('file');
  });
});
