import type { JSONSchema } from 'vscode-json-languageservice';

/**
 * Nx ships the authoritative project.json schema with the installed package: it describes every
 * property of the file. The schemas built in this library describe only the parts that need
 * workspace knowledge - executors, project names, target names, inputs - so the two are merged,
 * with the workspace-aware one winning wherever they overlap.
 *
 * `$schema` and `$id` are dropped because the result is a new document served under an `nx://` uri,
 * and a leftover identity would send `$ref` resolution somewhere else.
 */
export function mergeWithInstalledSchema(
  installedSchema: JSONSchema | undefined,
  dynamicSchema: JSONSchema,
): JSONSchema {
  if (!installedSchema) {
    return dynamicSchema;
  }
  const merged = {
    ...installedSchema,
    ...dynamicSchema,
    properties: {
      ...installedSchema.properties,
      ...dynamicSchema.properties,
    },
  } as JSONSchema & Record<string, unknown>;
  delete merged['$schema'];
  delete merged['$id'];
  return merged;
}
