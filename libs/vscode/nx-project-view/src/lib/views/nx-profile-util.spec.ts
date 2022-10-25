import * as win32Path from 'path/win32';
import * as posixPath from 'path/posix';
import { PathHelper } from './nx-project-util';

const dirsWindowsTests = (ph: PathHelper) => {
  it('only root results in empty output', () => {
    const input = 'C:\\';
    const output: string[] = [];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('absolute path results in array of folder names', () => {
    const input = 'C:\\Users\\foo\\nx-console';
    const output: string[] = ['Users', 'foo', 'nx-console'];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('absolute path (depth 1) results in array of folder names', () => {
    const input = 'C:\\Users';
    const output: string[] = ['Users'];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('relative path results in array of folder names', () => {
    const input = 'Users\\foo\\nx-console';
    const output: string[] = ['Users', 'foo', 'nx-console'];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('relative path (depth 1) results in array of folder names', () => {
    const input = 'Users';
    const output: string[] = ['Users'];
    expect(ph.dirs(input)).toEqual(output);
  });
};

const dirsLinuxTests = (ph: PathHelper) => {
  it('only root results in empty output', () => {
    const input = '/';
    const output: string[] = [];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('absolute path results in array of folder names', () => {
    const input = '/home/foo/nx-console';
    const output: string[] = ['home', 'foo', 'nx-console'];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('absolute path (depth 1) results in array of folder names', () => {
    const input = '/home';
    const output: string[] = ['home'];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('relative path results in array of folder names', () => {
    const input = 'home/foo/nx-console';
    const output: string[] = ['home', 'foo', 'nx-console'];
    expect(ph.dirs(input)).toEqual(output);
  });
  it('relative path (depth 1) results in array of folder names', () => {
    const input = 'home';
    const output: string[] = ['home'];
    expect(ph.dirs(input)).toEqual(output);
  });
};

const createPathPermutationsWindowsTests = (ph: PathHelper) => {
  it('only root results in empty output', () => {
    const input = 'C:\\';
    const output: string[] = [];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('absolute path results in folder permutations', () => {
    const input = 'C:\\Users\\foo\\nx-console';
    const output: string[] = [
      'C:\\Users\\foo\\nx-console',
      'C:\\Users\\foo',
      'C:\\Users',
    ];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('absolute path (depth 1) results in folder permutation', () => {
    const input = 'C:\\Users';
    const output: string[] = ['C:\\Users'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('relative path results in array in folder permutation', () => {
    const input = 'Users\\foo\\nx-console';
    const output: string[] = ['Users\\foo\\nx-console', 'Users\\foo', 'Users'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('relative path (depth 1) results in array in folder permutation', () => {
    const input = 'Users';
    const output: string[] = ['Users'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
};

const createPathPermutationsLinuxTests = (ph: PathHelper) => {
  it('only root results in empty output', () => {
    const input = '/';
    const output: string[] = [];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('absolute path results in array in folder permutation', () => {
    const input = '/home/foo/nx-console';
    const output: string[] = ['/home/foo/nx-console', '/home/foo', '/home'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('absolute path (depth 1) results in array in folder permutation', () => {
    const input = '/home';
    const output: string[] = ['/home'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('relative path results in array in folder permutation', () => {
    const input = 'home/foo/nx-console';
    const output: string[] = ['home/foo/nx-console', 'home/foo', 'home'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
  it('relative path (depth 1) results in array in folder permutation', () => {
    const input = 'home';
    const output: string[] = ['home'];
    expect(ph.createPathPermutations(input)).toEqual(output);
  });
};

describe('Project View: PathHelper', () => {
  describe('dirs', () => {
    it('empty input results in empty output', () => {
      const input = '';
      const output: string[] = [];
      expect(new PathHelper().dirs(input)).toEqual(output);
    });

    describe('windows', () => {
      const ph = new PathHelper(win32Path);
      dirsWindowsTests(ph);

      describe('with linux paths', () => {
        dirsLinuxTests(ph);
      });
    });

    describe('linux', () => {
      const ph = new PathHelper(posixPath);
      dirsLinuxTests(ph);

      describe('with windows paths', () => {
        dirsWindowsTests(ph);
      });
    });
  });
  describe('createPathPermutations', () => {
    it('empty input results in empty output', () => {
      const input = '';
      const output: string[] = [];
      expect(new PathHelper().createPathPermutations(input)).toEqual(output);
    });

    describe('windows', () => {
      const ph = new PathHelper(win32Path);
      createPathPermutationsWindowsTests(ph);

      describe('with linux paths', () => {
        createPathPermutationsLinuxTests(ph);
      });
    });

    describe('linux', () => {
      const ph = new PathHelper(posixPath);
      createPathPermutationsLinuxTests(ph);

      describe('with windows paths', () => {
        createPathPermutationsWindowsTests(ph);
      });
    });
  });
});
