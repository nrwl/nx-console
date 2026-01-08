/**
 * HTML content escaping for text inside HTML elements.
 * Prevents XSS by escaping characters that have special meaning in HTML.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * JavaScript string escaping for values inside JS string literals.
 * Use when embedding untrusted data inside JavaScript strings in templates.
 */
export function escapeJsString(unsafe: string): string {
  return unsafe
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

/**
 * Safe JSON embedding in script tags.
 * Prevents injection attacks like </script> breaking out of script context.
 */
export function safeJsonStringify(data: unknown): string {
  return escapeScriptTag(JSON.stringify(data));
}

/**
 * Escapes < and > in already-serialized JSON for safe embedding in script tags.
 * Use this when you have a pre-serialized JSON string.
 */
export function escapeScriptTag(serializedJson: string): string {
  return serializedJson.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
