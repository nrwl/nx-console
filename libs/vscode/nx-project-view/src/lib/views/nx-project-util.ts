import * as path from 'node:path';
import * as win32Path from 'path/win32';
import * as posixPath from 'path/posix';

export function isDefined<T>(val?: T): val is T {
  return !!val;
}

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export function objectEntries<T extends object>(val: T) {
  return Object.entries(val) as Entries<T>;
}

export class PathHelper {
  constructor(private pathApi: typeof path = path) {}

  detailedDirs(val: string) {
    if (!val) return [[] as string[], '', this.pathApi] as const;

    const oppositeApi = this.getOppositeApi();
    const api = val.includes(oppositeApi.sep) ? oppositeApi : this.pathApi;

    /**
     * @example windows:
     * path.parse('C:\\Users\\foo\\nx-console')
     * { root: 'C:\\', dir: 'C:\\Users\\foo', base: 'nx-console', ext: '', name: 'nx-console' }
     *
     * linux:
     * path.parse('/home/foo/nx-console')
     * { root: '/', dir: '/home/foo', base: 'nx-console', ext: '', name: 'nx-console' }
     */
    const { root, dir, base } = api.parse(val);
    const dirWithoutRoot = root ? dir.slice(root.length) : dir;
    const dirs = dirWithoutRoot ? dirWithoutRoot.split(api.sep) : [];
    if (base) {
      dirs.push(base);
    }

    return [dirs, root, api] as const;
  }

  dirs(val: string) {
    return this.detailedDirs(val)[0];
  }

  getDepth(val: string) {
    return this.dirs(val).length;
  }

  isRoot(val: string) {
    return this.getDepth(val) === 1;
  }

  getFolderName(val: string) {
    return this.dirs(val).pop() ?? '';
  }

  /**
   * Create a permutation for each sub directory.
   * @example
   * input: 'libs/shared/collections'
   * output: [
   *   'libs/shared/collections'
   *   'libs/shared'
   *   'libs'
   * ]
   */
  createPathPermutations(dir: string) {
    const [dirs, root, api] = this.detailedDirs(dir);
    const parts = dirs.reverse();
    const permutations: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const partialDir = api.join(root, ...parts.slice(i).reverse());
      permutations.push(partialDir);
    }
    return permutations;
  }

  private getOppositeApi() {
    if (this.pathApi.sep === win32Path.sep) {
      return posixPath;
    }
    return win32Path;
  }
}
