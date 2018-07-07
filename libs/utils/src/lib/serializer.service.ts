import { Injectable } from '@angular/core';

export interface Field {
  name: string;
  enum: string[];
  type: string;
  description: string;
  defaultValue: any;
  required: boolean;
  positional: boolean;
  important: boolean;
}

export interface Schematic {
  collection: string;
  name: string;
  description: string;
  schema: Field[];
}

export interface SchematicCollection {
  name: string;
  schematics: Array<Schematic>;
}

export interface Builder {
  name: string;
  description: string;
  builder: string;
  project: string;
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
  normalizeSchematic(schematic: Schematic): Schematic {
    const schema = schematic.schema.map(f => ({
      ...f,
      important:
        f.positional ||
        this.importantSchematicField(schematic.collection, f.name)
    }));
    const normal = {
      ...schematic,
      schema: this.reoderFields(schema)
    };
    if (normal.description.endsWith('.')) {
      normal.description = normal.description.slice(
        0,
        normal.description.length - 1
      );
    }
    return normal;
  }

  normalizeTarget(builder: string, schema: Field[]): Field[] {
    return this.reoderFields(
      schema.map(f => ({
        ...f,
        important:
          f.positional ||
          f.required ||
          this.importantBuilderField(builder, f.name)
      }))
    );
  }

  reoderFields(fields: Field[]): Field[] {
    return [
      ...fields.filter(r => r.positional),
      ...fields.filter(r => !r.positional && r.important),
      ...fields.filter(r => !r.positional && !r.important)
    ].map(f => {
      let d = f.defaultValue;
      if (f.type === 'boolean' && f.defaultValue !== undefined) {
        d = f.defaultValue === 'true';
      }
      return { ...f, defaultValue: d };
    });
  }

  serializeArgs(value: { [p: string]: any }, schema: Field[]): string[] {
    const fields = schema.filter(
      s => value[s.name] !== undefined && value[s.name] !== null
    );
    const args = fields
      .map(f => {
        if (f.defaultValue === value[f.name]) return null;
        if (f.positional) {
          return value[f.name];
        } else if (f.type === 'boolean') {
          return value[f.name] ? `--${f.name}` : `--no-${f.name}`;
        } else {
          return `--${f.name}=${value[f.name]}`;
        }
      })
      .filter(r => !!r);
    return args;
  }

  argsToString(args: string[]): string {
    return args
      .map(a => {
        return a.indexOf(' ') > -1 ? `"${a}"` : a;
      })
      .join(' ');
  }

  private importantSchematicField(collection: string, name: string) {
    if (
      collection === '@schematics/angular' ||
      collection === '@ngrx/schematics' ||
      collection === '@nrwl/schematics'
    ) {
      return name === 'export' || name === 'module' || name === 'project';
    } else {
      return false;
    }
  }
  private importantBuilderField(builder: string, name: string) {
    if (builder.startsWith('@angular-devkit/build-angular')) {
      return name === 'aot' || name === 'watch' || name === 'browsers';
    } else {
      return false;
    }
  }
}
