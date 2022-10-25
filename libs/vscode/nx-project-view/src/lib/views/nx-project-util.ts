import path = require('node:path');

export function isDefined<T>(val?: T): val is T {
  return !!val;
}

export const PathHelper = {
  dirs(val: string) {
    return val.split(path.sep);
  },
  getDepth(val: string) {
    return this.dirs(val).length;
  },
  isRoot(val: string) {
    return this.getDepth(val) === 1;
  },
  getFolderName(val: string) {
    return this.dirs(val).pop() ?? '';
  },
} as const;
