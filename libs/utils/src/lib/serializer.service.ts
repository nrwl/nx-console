import { Injectable } from '@angular/core';

export interface Field {
  name: string;
  enum: string[];
  type: string;
  description: string;
  defaultValue: any;
  required: boolean;
  positional: boolean;
}

export interface Schematic {
  collection: string;
  name: string;
  description: string;
  schema: Field[];
}

export interface Builder {
  name: string;
  description: string;
  builder: string;
  schema: Field[];
}


export interface Project {
  name: string;
  projectType: string;
  root: string;
  architect: Builder[];
}

@Injectable({
  providedIn: 'root'
})
export class Serializer {
  normalize(fields: Field[]): Field[] {
    return [...fields.filter(r => r.positional), ...fields.filter(r => !r.positional)].map(f => {
      let d = f.defaultValue;
      if (f.type === 'boolean' && f.defaultValue !== undefined) {
        d = f.defaultValue === 'true';
      }
      return { ...f, defaultValue: d };
    });
  }

  serializeArgs(value: { [p: string]: any }, schema: Field[]): string[] {
    let fields = schema.filter(s => value[s.name] !== undefined && value[s.name] !== null);
    const args = fields.map(f => {
      if (f.positional) {
        return value[f.name];
      } else if (f.type === 'boolean') {
        return value[f.name] ? `--${f.name}` : `--no-${f.name}`;
      } else {
        return `--${f.name}=${value[f.name]}`;
      }
    });
    return args;
  }
}
