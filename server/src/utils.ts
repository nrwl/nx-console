import * as path from 'path';

const resolve = require('resolve');
import * as fs from 'fs';
import { platform } from 'os';
import { statSync } from 'fs';

export function findClosestNg(dir: string): string {
  if (directoryExists(path.join(dir, 'node_modules'))) {
    if (platform() === 'win32') {
      if (fileExists(path.join(dir, 'ng.cmd'))) {
        return path.join(dir, 'ng.cmd');
      } else {
        return path.join(dir, 'node_modules', '.bin', 'ng.cmd');
      }
    } else {
      if (fileExists(path.join(dir, 'node_modules', '.bin', 'ng'))) {
        return path.join(dir, 'node_modules', '.bin', 'ng');
      } else {
        return path.join(dir, 'node_modules', '@angular', 'cli', 'bin', 'ng');
      }
    }
  } else {
    return findClosestNg(path.dirname(dir));
  }
}

export function listFilesRec(dirName: string): string[] {
  if (dirName.indexOf('node_modules') > -1) return [];

  const res = [dirName];
  // the try-catch here is intentional. It's only used in autocomletion.
  // If it doesn't work, we don't want the process to exit
  try {
    fs.readdirSync(dirName).forEach(c => {
      const child = path.join(dirName, c);
      try {
        if (!fs.statSync(child).isDirectory()) {
          res.push(child);
        } else if (fs.statSync(child).isDirectory()) {
          res.push(...listFilesRec(child));
        }
      } catch (e) {}
    });
  } catch (e) {}
  return res;
}

export function directoryExists(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch (err) {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

export function readJsonFile(
  path: string,
  basedir: string
): { [k: string]: any } {
  const fullFilePath = resolve.sync(path, { basedir });
  return {
    path: fullFilePath,
    json: JSON.parse(fs.readFileSync(fullFilePath).toString())
  };
}

export function normalizeSchema(p: {
  properties: { [k: string]: any };
  required: string[];
}): any[] {
  const res = [] as any[];
  Object.entries(p.properties).forEach(([k, v]: [string, any]) => {
    if (v.visible === undefined || v.visible) {
      const d = getDefault(v);
      const p = isPositional(v);
      const r = (p.required && p.required.indexOf(k) > -1) || hasSource(v);

      res.push({
        name: k,
        type: v.type || 'string',
        description: v.description,
        defaultValue: d,
        required: r,
        positional: p,
        enum: v.enum
      });
    }
  });
  return res;
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
