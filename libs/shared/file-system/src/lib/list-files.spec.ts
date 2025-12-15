import { listFiles } from './list-files';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('listFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-console-test-'));
  });

  afterEach(() => {
    // Retry removal to handle potential file locking issues on some OSes
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  it('should ignore files listed in .gitignore', () => {
    // Setup
    const ignoredFile = path.join(tmpDir, 'ignored.txt');
    const includedFile = path.join(tmpDir, 'included.txt');
    const gitignore = path.join(tmpDir, '.gitignore');
    const nestedDir = path.join(tmpDir, 'nested');
    const nestedIgnored = path.join(nestedDir, 'nested-ignored.txt');
    const nestedIncluded = path.join(nestedDir, 'nested-included.txt');

    fs.mkdirSync(nestedDir);
    fs.writeFileSync(ignoredFile, 'content');
    fs.writeFileSync(includedFile, 'content');
    fs.writeFileSync(nestedIgnored, 'content');
    fs.writeFileSync(nestedIncluded, 'content');
    fs.writeFileSync(gitignore, 'ignored.txt\nnested/nested-ignored.txt');

    // Execute
    const files = listFiles(tmpDir);

    // Verify
    expect(files).toContain(includedFile);
    expect(files).toContain(nestedIncluded);

    // These assertions should fail currently
    expect(files).not.toContain(ignoredFile);
    expect(files).not.toContain(nestedIgnored);
  });

  it('should ignore node_modules and dist by default', () => {
    const nodeModules = path.join(tmpDir, 'node_modules');
    const dist = path.join(tmpDir, 'dist');

    fs.mkdirSync(nodeModules);
    fs.mkdirSync(dist);
    fs.writeFileSync(path.join(nodeModules, 'file.txt'), 'content');
    fs.writeFileSync(path.join(dist, 'file.txt'), 'content');

    const files = listFiles(tmpDir);

    expect(files).not.toContain(path.join(nodeModules, 'file.txt'));
    expect(files).not.toContain(path.join(dist, 'file.txt'));
  });
});
