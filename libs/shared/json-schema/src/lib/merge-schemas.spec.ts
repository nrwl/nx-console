import { JSONSchema } from 'vscode-json-languageservice';
import { mergeWithInstalledSchema } from './merge-schemas';

const installedSchema = {
  $schema: 'http://json-schema.org/schema',
  $id: 'NxProjectConfiguration',
  type: 'object',
  properties: {
    name: { type: 'string' },
    projectType: { type: 'string', enum: ['library', 'application'] },
    tags: { type: 'array', items: { type: 'string' } },
    targets: { type: 'object', description: 'from the installed package' },
  },
  definitions: { inputs: { type: 'array' } },
} as JSONSchema;

const dynamicSchema = {
  type: 'object',
  properties: {
    tags: { type: 'array', 'x-completion-type': 'tags' },
    targets: { type: 'object', description: 'knows this workspace' },
  },
} as JSONSchema;

describe('mergeWithInstalledSchema', () => {
  it('keeps the properties only the installed schema describes', () => {
    const merged = mergeWithInstalledSchema(installedSchema, dynamicSchema);

    expect(merged.properties?.['name']).toEqual({ type: 'string' });
    expect(merged.properties?.['projectType']).toEqual({
      type: 'string',
      enum: ['library', 'application'],
    });
  });

  it('lets the workspace-aware schema win where the two overlap', () => {
    const merged = mergeWithInstalledSchema(installedSchema, dynamicSchema);

    expect(merged.properties?.['tags']).toEqual({
      type: 'array',
      'x-completion-type': 'tags',
    });
    expect(merged.properties?.['targets']).toEqual({
      type: 'object',
      description: 'knows this workspace',
    });
  });

  it('keeps definitions so internal $refs still resolve', () => {
    const merged = mergeWithInstalledSchema(installedSchema, dynamicSchema);

    expect(merged.definitions?.['inputs']).toEqual({ type: 'array' });
  });

  it('drops the installed schema identity', () => {
    const merged = mergeWithInstalledSchema(installedSchema, dynamicSchema);

    expect(merged.$schema).toBeUndefined();
    expect(merged.$id).toBeUndefined();
  });

  it('falls back to the workspace-aware schema when Nx is not installed', () => {
    expect(mergeWithInstalledSchema(undefined, dynamicSchema)).toBe(
      dynamicSchema,
    );
  });
});
