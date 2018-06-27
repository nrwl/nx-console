import * as resolve from 'resolve';
import * as fs from 'fs';

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
  const res = [];
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
