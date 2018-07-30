import { directoryExists, fileExists } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Observable, bindNodeCallback, of, throwError } from 'rxjs';
import { Directory, LocalFile, LocalFileType } from '../../libs/schema/src';
import { map, switchMap, catchError, concatAll, zipAll } from 'rxjs/operators';

const observableReadDir = bindNodeCallback(fs.readdir);
const observableStat = bindNodeCallback(fs.stat);

export function readDirectory(
  _dirName: string,
  onlyDirectories: boolean,
  showHidden: boolean
): Observable<Directory> {
  const dirName =
    _dirName !== '' ? _dirName : os.platform() === 'win32' ? 'C:' : '/';

  if (!directoryExists(dirName)) {
    throw new Error(`Cannot find directory: '${dirName}'`);
  }

  return observableReadDir(dirName).pipe(
    switchMap(
      (files: Array<string>): Array<Observable<LocalFile>> => {
        return files.map(
          (c): Observable<LocalFile> => {
            const child = path.join(dirName, c);

            return observableStat(child).pipe(
              switchMap(
                (stat: fs.Stats): Observable<LocalFile> => {
                  if (!stat.isDirectory()) {
                    return of({ name: c, type: 'file' as LocalFileType });
                  }
                  return fileExists(path.join(dirName, c, 'angular.json')).pipe(
                    map(() => {
                      return {
                        name: c,
                        type: 'angularDirectory' as LocalFileType
                      };
                    }),
                    catchError(
                      (): Observable<LocalFile> => {
                        return of({
                          name: c,
                          type: 'directory' as LocalFileType
                        });
                      }
                    )
                  );
                }
              )
            );
          }
        );
      }
    ),
    zipAll(),
    map(
      (files: Array<LocalFile>): Directory => {
        return {
          path: dirName,
          files: files.filter(t => {
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
        };
      }
    )
  );
}
