import { AutocompletionType, Field, Schematic } from '@angular-console/schema';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Serializer {
  normalizeSchematic(schematic: Schematic): Schematic {
    const schema = schematic.schema.map(f => ({
      ...f,
      important:
        f.positional ||
        this.importantSchematicField(schematic.collection, f.name),
      completion: this.completionSchematicType(schematic.collection, f.name)
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
        required: false,
        important: f.positional || this.importantBuilderField(builder, f.name),
        completion: this.completionBuilderType(builder, f.name)
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
      if (f.type === 'boolean' && f.defaultValue === 'false') {
        d = f.defaultValue = false;
      }
      if (f.type === 'boolean' && f.defaultValue === 'true') {
        d = f.defaultValue = true;
      }
      return { ...f, defaultValue: d };
    });
  }

  serializeArgs(value: { [p: string]: any }, schema: Field[]): string[] {
    const fields = schema.filter(
      s =>
        value[s.name] !== undefined &&
        value[s.name] !== null &&
        value[s.name] !== ''
    );
    let args: string[] = [];
    fields.forEach(f => {
      if (f.defaultValue === value[f.name]) return;
      if (f.positional) {
        args.push(value[f.name]);
      } else if (f.type === 'boolean') {
        args.push(value[f.name] ? `--${f.name}` : `--no-${f.name}`);
      } else if (f.type === 'arguments') {
        args = [...args, ...value[f.name].split(' ').filter((r: any) => !!r)];
      } else {
        args.push(`--${f.name}=${value[f.name]}`);
      }
    });
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
      return (
        name === 'export' ||
        name === 'module' ||
        name === 'project' ||
        name === 'directory' ||
        name === 'name'
      );
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

  private completionSchematicType(collection: string, name: string): any {
    if (
      collection === '@schematics/angular' ||
      collection === '@ngrx/schematics' ||
      collection === '@nrwl/schematics'
    ) {
      if (name === 'project') return 'projects';
      if (name === 'module') return 'localModules';
      if (name === 'parentModule') return 'absoluteModules';
    }
    return undefined;
  }

  private completionBuilderType(
    builder: string,
    name: string
  ): AutocompletionType | undefined {
    if (builder.startsWith('@angular-devkit/build-angular')) {
      if (name === 'project') return 'projects';
      if (name === 'module') return 'localModules';
      if (name === 'parentModule') return 'absoluteModules';
    }
    return undefined;
  }
}
