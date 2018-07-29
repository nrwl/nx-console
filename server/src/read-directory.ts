import { directoryExists, fileExists } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function readDirectory(
  _dirName: string,
  onlyDirectories: boolean,
  showHidden: boolean
) {
  const dirName =
    _dirName !== '' ? _dirName : os.platform() === 'win32' ? 'C:' : '/';
  if (!directoryExists(dirName)) {
    throw new Error(`Cannot find directory: '${dirName}'`);
  }
  const files = fs
    .readdirSync(dirName)
    .map(c => {
      const child = path.join(dirName, c);
      try {
        if (fs.statSync(child).isDirectory()) {
          if (fileExists(path.join(dirName, c, 'angular.json'))) {
            return { name: c, type: 'angularDirectory' };
          } else {
            return { name: c, type: 'directory' };
          }
        } else {
          return { name: c, type: 'file' };
        }
      } catch (e) {}
    })
    .filter(t => {
      if (!t) return false;

      let show = true;
      if (onlyDirectories && t.type === 'file') {
        show = false;
      }
      if (!showHidden && t.name.startsWith('.')) {
        show = false;
      }
      return show;
    })
    .map((t: any) => {
      const hasChildren =
        fs.readdirSync(`${dirName}/${t.name}`).filter(child => {
          try {
            return fs.statSync(`${dirName}/${t.name}/${child}`).isDirectory();
          } catch (e) {
            return false;
          }
        }).length > 0;
      return { ...t, hasChildren };
    });

  return { path: dirName, files };
}
