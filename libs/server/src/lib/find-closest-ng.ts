import { platform } from 'os';
import { dirname, join } from 'path';

import { directoryExists, fileExistsSync } from './utils/utils';

export function findClosestNg(dir: string): string {
  if (directoryExists(join(dir, 'node_modules'))) {
    if (platform() === 'win32') {
      if (fileExistsSync(join(dir, 'ng.cmd'))) {
        return join(dir, 'ng.cmd');
      } else {
        return join(dir, 'node_modules', '.bin', 'ng.cmd');
      }
    } else {
      if (fileExistsSync(join(dir, 'node_modules', '.bin', 'ng'))) {
        return join(dir, 'node_modules', '.bin', 'ng');
      } else {
        return join(dir, 'node_modules', '@angular', 'cli', 'bin', 'ng');
      }
    }
  } else {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Cannot find 'ng'`);
    }
    return findClosestNg(parent);
  }
}
