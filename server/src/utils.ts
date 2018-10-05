import { execSync } from 'child_process';
import * as fs from 'fs';
import { stat, statSync } from 'fs';
import { platform } from 'os';
import * as path from 'path';
import { bindNodeCallback, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as stripJsonComments from 'strip-json-comments';

export const files: { [path: string]: string[] } = {};
export let fileContents: { [path: string]: any } = {};

export function exists(cmd: string): boolean {
  try {
    if (platform() === 'win32') {
      execSync(`where ${cmd}`).toString();
    } else {
      execSync(`which ${cmd}`).toString();
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function findExecutable(command: string, cwd: string): string {
  const paths = (process.env.PATH as string).split(path.delimiter);
  if (paths === void 0 || paths.length === 0) {
    return path.join(cwd, command);
  }
  const r = findInPath(command, cwd, paths);
  return r ? r : path.join(cwd, command);
}

export function hasExecutable(command: string, cwd: string): boolean {
  const paths = (process.env.PATH as string).split(path.delimiter);
  if (paths === void 0 || paths.length === 0) {
    return false;
  } else {
    return !!findInPath(command, cwd, paths);
  }
}

function findInPath(
  command: string,
  cwd: string,
  paths: string[]
): string | undefined {
  for (let pathEntry of paths) {
    let fullPath: string;
    if (path.isAbsolute(pathEntry)) {
      fullPath = path.join(pathEntry, command);
    } else {
      fullPath = path.join(cwd, pathEntry, command);
    }
    if (fs.existsSync(fullPath + '.exe')) {
      return fullPath + '.exe';
    } else if (fs.existsSync(fullPath + '.cmd')) {
      return fullPath + '.cmd';
    } else if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

export function findClosestNg(dir: string): string {
  if (directoryExists(path.join(dir, 'node_modules'))) {
    if (platform() === 'win32') {
      if (fileExistsSync(path.join(dir, 'ng.cmd'))) {
        return path.join(dir, 'ng.cmd');
      } else {
        return path.join(dir, 'node_modules', '.bin', 'ng.cmd');
      }
    } else {
      if (fileExistsSync(path.join(dir, 'node_modules', '.bin', 'ng'))) {
        return path.join(dir, 'node_modules', '.bin', 'ng');
      } else {
        return path.join(dir, 'node_modules', '@angular', 'cli', 'bin', 'ng');
      }
    }
  } else {
    return findClosestNg(path.dirname(dir));
  }
}

export function listOfUnnestedNpmPackages(nodeModulesDir: string): string[] {
  const res: string[] = [];
  fs.readdirSync(nodeModulesDir).forEach(npmPackageOrScope => {
    if (npmPackageOrScope.startsWith('@')) {
      fs.readdirSync(path.join(nodeModulesDir, npmPackageOrScope)).forEach(
        p => {
          res.push(`${npmPackageOrScope}/${p}`);
        }
      );
    } else {
      res.push(npmPackageOrScope);
    }
  });
  return res;
}

export function listFiles(dirName: string): string[] {
  // TODO use .gitignore to skip files
  if (dirName.indexOf('node_modules') > -1) return [];
  if (dirName.indexOf('dist') > -1) return [];

  const res = [dirName];
  // the try-catch here is intentional. It's only used in auto-completion.
  // If it doesn't work, we don't want the process to exit
  try {
    fs.readdirSync(dirName).forEach(c => {
      const child = path.join(dirName, c);
      try {
        if (!fs.statSync(child).isDirectory()) {
          res.push(child);
        } else if (fs.statSync(child).isDirectory()) {
          res.push(...listFiles(child));
        }
      } catch (e) {}
    });
  } catch (e) {}
  return res;
}

function cacheJsonFiles(basedir: string) {
  try {
    const nodeModulesDir = path.join(basedir, 'node_modules');
    const packages = listOfUnnestedNpmPackages(nodeModulesDir);

    const res: any = {};
    const schematicCollections = packages.forEach(p => {
      const filePath = path.join(nodeModulesDir, p, 'package.json');
      if (!fileExistsSync(filePath)) return;
      res[filePath] = readAndParseJson(
        path.join(nodeModulesDir, p, 'package.json')
      );
    });
    return res;
  } catch (e) {
    return {};
  }
}

export function directoryExists(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch (err) {
    return false;
  }
}

export function fileExistsSync(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

const observableStat = bindNodeCallback(stat);
export function fileExists(filePath: string): Observable<boolean> {
  return observableStat(filePath).pipe(map(stat => stat.isFile()));
}

function readAndParseJson(fullFilePath: string): any {
  return JSON.parse(
    stripJsonComments(fs.readFileSync(fullFilePath).toString())
  );
}

export function readJsonFile(
  filePath: string,
  basedir: string
): { path: string; json: any } {
  const fullFilePath = path.join(basedir, filePath);

  // we can try to retrieve node_modules files from the cache because
  // they don't change very often
  const cache = basedir.endsWith('node_modules');
  if (cache && fileContents[fullFilePath]) {
    return {
      path: fullFilePath,
      json: fileContents[fullFilePath]
    };
  } else {
    return {
      path: fullFilePath,
      json: readAndParseJson(fullFilePath)
    };
  }
}

export function normalizeSchema(p: {
  properties: { [k: string]: any };
  required: string[];
}): any[] {
  try {
    const res = [] as any[];
    Object.entries(p.properties).forEach(([k, v]: [string, any]) => {
      if (v.visible === undefined || v.visible) {
        const d = getDefault(v);
        const r = (p.required && p.required.indexOf(k) > -1) || hasSource(v);

        res.push({
          name: k,
          type: v.type || 'string',
          description: v.description,
          defaultValue: d,
          required: r,
          positional: isPositional(v),
          enum: v.enum
        });
      }
    });
    return res;
  } catch (e) {
    console.error(`normalizeSchema error: '${e.message}'`);
    throw e;
  }
}

function getDefault(prop: any): any {
  if (prop['default'] === undefined && prop['$default'] === undefined)
    return undefined;
  const d = prop['default'] !== undefined ? prop['default'] : prop['$default'];
  return !d['$source'] ? d.toString() : undefined;
}

function isPositional(prop: any): any {
  if (prop['default'] === undefined && prop['$default'] === undefined)
    return false;
  const d = prop['default'] !== undefined ? prop['default'] : prop['$default'];
  return d['$source'] === 'argv';
}

function hasSource(prop: any): any {
  if (prop['default'] === undefined && prop['$default'] === undefined)
    return false;
  const d = prop['default'] !== undefined ? prop['default'] : prop['$default'];
  return !!d['$source'];
}

export function filterByName<T>(t: T[], args: { name?: string }): T[] {
  return args.name ? t.filter((s: any) => s.name === args.name) : t;
}

export function filterById<T>(t: T[], args: { id?: string }): T[] {
  return args.id ? t.filter((s: any) => s.id === args.id) : t;
}

export function normalizePath(value: string): string {
  const firstPart = value.split('/')[0];
  if (!firstPart) return value;
  if (!firstPart.endsWith(':')) return value;
  return value
    .replace(new RegExp('/', 'g'), '\\')
    .split('\\')
    .filter(r => !!r)
    .join('\\');
}

/**
 * To improve performance angular console pre-processes
 *
 * * the list of local files
 * * json files from node_modules we are likely to read
 *
 * both the data sets get updated every 30 seconds.
 */
export function cacheFiles(path: string) {
  setTimeout(() => {
    files[path] = listFiles(path);
    fileContents = cacheJsonFiles(path);
    setTimeout(() => {
      cacheFiles(path);
    }, 30000);
  }, 0);
}
