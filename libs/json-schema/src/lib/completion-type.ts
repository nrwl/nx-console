import { JSONSchema } from 'vscode-json-languageservice';
import { hasKey } from '@nx-console/utils/shared';

export const X_COMPLETION_TYPE = 'x-completion-type' as const;
export const X_COMPLETION_GLOB = 'x-completion-glob' as const;

export type CompletionType = 'file' | 'directory' | 'target';

export function hasCompletionType(
  schema: JSONSchema
): schema is JSONSchema & { [X_COMPLETION_TYPE]: CompletionType } {
  return hasKey(schema, X_COMPLETION_TYPE);
}

export function hasCompletionGlob(
  schema: JSONSchema
): schema is JSONSchema & { [X_COMPLETION_GLOB]: string } {
  return hasKey(schema, X_COMPLETION_GLOB);
}
