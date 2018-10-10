import { directoryExists, fileExists } from '../utils';
import * as fs from 'fs';
import * as path from 'path';
const drivelist: any = require('drivelist');
import { bindNodeCallback, Observable, of, Subject, zip } from 'rxjs';
import { Directory, LocalFile, LocalFileType } from '../../../libs/schema/src';
import { catchError, map, switchMap, zipAll } from 'rxjs/operators';
import * as os from 'os';

const observableReadDir = bindNodeCallback(fs.readdir);
const observableStat = bindNodeCallback(fs.stat);
const observableRealpath = bindNodeCallback(fs.realpath);

export function readDirectory(
  dirName: string,
  onlyDirectories: boolean,
  showHidden: boolean
): Observable<Directory> {
  if (dirName === '') {
    return _defaultRootDirectory(onlyDirectories, showHidden);
  } else {
    if (dirName !== '/' && !directoryExists(dirName)) {
      return of(null);
    }
    return _readDirectory(dirName, onlyDirectories, showHidden);
  }
}

function skipSyntheticDirsOnWindows(p: string, realPath: string): boolean {
  return p !== realPath && os.platform() === 'win32';
}

function _readDirectory(
  dirName: string,
  onlyDirectories: boolean,
  showHidden: boolean
) {
  return observableReadDir(dirName).pipe(
    switchMap(
      (files: Array<string>): Array<Observable<LocalFile | null>> => {
        return files.map(
          (c): Observable<LocalFile | null> => {
            const child = path.join(dirName, c);

            return zip(observableStat(child), observableRealpath(child)).pipe(
              switchMap(
                ([stat, realPath]: [
                  fs.Stats,
                  string
                ]): Observable<LocalFile | null> => {
                  if (skipSyntheticDirsOnWindows(child, realPath)) {
                    return of(null);
                  }

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
              ),
              catchError(
                (): Observable<LocalFile | null> => {
                  return of(null);
                }
              )
            );
          }
        );
      }
    ),
    zipAll(),
    map(
      (files: Array<LocalFile | null>): Directory => {
        return {
          path: dirName,
          exists: true,
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
          }) as any
        };
      }
    )
  );
}

function _defaultRootDirectory(onlyDirectories: boolean, showHidden: boolean) {
  return os.platform() === 'win32'
    ? mountPoints()
    : _readDirectory('/', onlyDirectories, showHidden);
}

export function mountPoints(): Observable<Directory> {
  const res = new Subject<Directory>();

  drivelist.list((errors: any, drives: any) => {
    if (errors) {
      res.error(errors[0]);
    } else {
      let mountpoints: any = [];
      drives.forEach((d: any) => {
        mountpoints = [
          ...mountpoints,
          ...d.mountpoints.map((p: any) => {
            const name = p.path.endsWith('\\')
              ? `${p.path.substring(0, p.path.length - 1)}//`
              : p.path;
            return { name, type: 'directory' };
          })
        ];
      });
      res.next({ path: '', exists: true, files: mountpoints });
      res.complete();
    }
  });

  return res;
}
