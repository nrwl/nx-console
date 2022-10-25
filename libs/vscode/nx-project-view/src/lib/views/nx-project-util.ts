import path = require('node:path');

export function isDefined<T>(val?: T): val is T {
  return !!val;
}

export class PathHelper {
  constructor(private pathApi: typeof path = path) {}

  detailedDirs(val: string) {
    if (!val) return [[] as string[], ''] as const;
    /**
     * @example windows:
     * path.parse('C:\\Users\\foo\\nx-console')
     * { root: 'C:\\', dir: 'C:\\Users\\foo', base: 'nx-console', ext: '', name: 'nx-console' }
     *
     * linux:
     * path.parse('/home/foo/nx-console')
     * { root: '/', dir: '/home/foo', base: 'nx-console', ext: '', name: 'nx-console' }
     */
    const { root, dir, base } = this.pathApi.parse(val);
    const dirWithoutRoot = root ? dir.slice(root.length) : dir;
    const dirs = dirWithoutRoot ? dirWithoutRoot.split(this.pathApi.sep) : [];
    if (base) {
      dirs.push(base);
    }

    return [dirs, root] as const;
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
    const [dirs, root] = this.detailedDirs(dir);
    const parts = dirs.reverse();
    const permutations: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const partialDir = this.pathApi.join(root, ...parts.slice(i).reverse());
      permutations.push(partialDir);
    }
    return permutations;
  }
}
