import { Inject, Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import * as path from 'path';
import { existsSync, statSync } from 'fs';
import { platform } from 'os';
import { readSettings } from '@angular-console/server';

@Injectable()
export class FileUtils {
  constructor(@Inject('store') private readonly store: any) {}

  isWsl(): boolean {
    return !!readSettings(this.store).isWsl;
  }

  findExecutable(command: string, cwd: string): string {
    const paths = this.getPaths();
    if (paths === void 0 || paths.length === 0) {
      return this.joinForCommandRun(cwd, command);
    }
    const r = this.findInPath(command, cwd, paths);
    return r ? r : this.joinForCommandRun(cwd, command);
  }

  hasExecutable(command: string, cwd: string): boolean {
    const paths = this.getPaths();
    if (paths === void 0 || paths.length === 0) {
      return false;
    } else {
      return !!this.findInPath(command, cwd, paths);
    }
  }

  getPaths() {
    if (this.isWsl()) {
      const p = execSync('wsl -e printenv')
        .toString()
        .split('\n')
        .filter(v => v.startsWith('PATH='))[0]
        .trim();
      return p.substring(5).split(':');
    } else {
      return (process.env.PATH as string).split(path.delimiter);
    }
  }

  convertToWslPath(p: string) {
    if (this.isWsl() && !p.startsWith('/')) {
      return execSync(`wsl -e wslpath -u ${p}`)
        .toString()
        .trim();
    } else {
      return p;
    }
  }

  unwrapWslPath(p: string) {
    if (this.isWsl() && p.startsWith('/')) {
      return execSync(`wsl -e wslpath -w ${p}`)
        .toString()
        .trim();
    } else {
      return p;
    }
  }

  findInPath(
    command: string,
    cwd: string,
    paths: string[]
  ): string | undefined {
    for (const pathEntry of paths) {
      let fullPath: string;
      if (path.isAbsolute(pathEntry)) {
        fullPath = this.joinForCommandRun(pathEntry, command);
      } else {
        fullPath = this.joinForCommandRun(
          this.convertToWslPath(cwd),
          pathEntry,
          command
        );
      }
      if (
        existsSync(fullPath + '.exe') &&
        platform() === 'win32' &&
        !this.isWsl()
      ) {
        return fullPath + '.exe';
      } else if (
        existsSync(fullPath + '.cmd') &&
        platform() === 'win32' &&
        !this.isWsl()
      ) {
        return fullPath + '.cmd';
      } else if (existsSync(fullPath)) {
        return fullPath;
      }
    }
    return undefined;
  }

  findClosestNg(d: string): string {
    const dir = this.convertToWslPath(d);
    console.log('normalized dir', d, dir);
    if (this.directoryExists(this.joinForCommandRun(dir, 'node_modules'))) {
      if (platform() === 'win32' && !this.isWsl()) {
        if (this.fileExistsSync(this.joinForCommandRun(dir, 'ng.cmd'))) {
          return this.joinForCommandRun(dir, 'ng.cmd');
        } else {
          return this.joinForCommandRun(dir, 'node_modules', '.bin', 'ng.cmd');
        }
      } else {
        if (
          this.fileExistsSync(
            this.joinForCommandRun(dir, 'node_modules', '.bin', 'ng')
          )
        ) {
          return this.joinForCommandRun(dir, 'node_modules', '.bin', 'ng');
        } else {
          return this.joinForCommandRun(
            dir,
            'node_modules',
            '@angular',
            'cli',
            'bin',
            'ng'
          );
        }
      }
    } else {
      const parent = path.dirname(dir);
      if (parent === dir) {
        throw new Error(`Cannot find 'ng'`);
      }
      return this.findClosestNg(parent);
    }
  }

  joinForCommandRun(...p: string[]) {
    return p
      .splice(1)
      .reduce((a, b) => (this.isWsl() ? `${a}/${b}` : path.join(a, b)), p[0]);
  }

  directoryExists(filePath: string): boolean {
    try {
      return statSync(this.unwrapWslPath(filePath)).isDirectory();
    } catch (err) {
      return false;
    }
  }

  fileExistsSync(filePath: string): boolean {
    try {
      return statSync(this.unwrapWslPath(filePath)).isFile();
    } catch (err) {
      return false;
    }
  }
}
