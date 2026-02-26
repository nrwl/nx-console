import { URI } from 'vscode-uri';
import { join } from 'path';
import { getUriForError } from './get-uri-for-error';

jest.mock('vscode', () => ({
  Uri: URI,
}));

describe('getUriForError', () => {
  it('should handle files with illegal characters', () => {
    const path = 'my path:config.json';
    expect(() => URI.parse(path)).toThrow('Scheme contains illegal characters');
    const error = { file: path };
    const uri = getUriForError(error, '/workspace');
    expect(uri.scheme).toBe('file');
    expect(uri.fsPath).toBe(join('/workspace', path));
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
});
