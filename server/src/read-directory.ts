import { directoryExists, fileExists } from './utils';
import * as fs from 'fs';
import * as path from 'path';

export function readDirectory(
  dirName: string,
  onlyDirectories: boolean,
  showHidden: boolean
) {
  if (!dirName) {
    dirName = process.env.HOME;
  }

  if (!directoryExists(dirName)) {
    throw new Error(`Cannot find directory: '${dirName}'`);
  }

  const files = fs
    .readdirSync(dirName)
    .map(c => {
      const child = path.join(dirName, c);
      if (fs.statSync(child).isDirectory()) {
        if (fileExists(path.join(dirName, c, 'angular.json'))) {
          return { name: c, type: 'angularDirectory' };
        } else {
          return { name: c, type: 'directory' };
        }
      } else {
        return { name: c, type: 'file' };
      }
    })
    .filter(t => {
      let show = true;
      if (onlyDirectories && t.type === 'file') {
        show = false;
      }
      if (!showHidden && t.name.startsWith('.')) {
        show = false;
      }
      return show;
    })
    .map(t => {
      const hasChildren =
        fs.readdirSync(`${dirName}/${t.name}`).filter(child => {
          return fs.statSync(`${dirName}/${t.name}/${child}`).isDirectory();
        }).length > 0;
      return { ...t, hasChildren };
    });

  return { path: dirName, files };
}
