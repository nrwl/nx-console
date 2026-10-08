export type ParsedNxCloudUrl =
  | { type: 'cipe'; cipeId: string }
  | { type: 'run'; runId: string }
  | { type: 'task'; runId: string; taskId: string };

/**
 * @deprecated Use ParsedNxCloudUrl instead
 */
export type ParsedCipeUrl = {
  cipeId: string;
};

/**
 * Parse an Nx Cloud URL to extract resource identifiers.
 *
 * Supported URL patterns (additional path segments and query params are ignored):
 * - /cipes/{id}[/...]                → { type: 'cipe', cipeId }
 * - /runs/{id}[/...]                 → { type: 'run', runId }
 * - /runs/{id}/task/{taskId}[/...]   → { type: 'task', runId, taskId }
 *
 * @param url The Nx Cloud URL to parse
 * @returns Parsed URL info or null if URL doesn't match any known pattern
 */
export function parseNxCloudUrl(url: string): ParsedNxCloudUrl | null {
  let pathname: string;

  try {
    const parsed = new URL(url);
    pathname = parsed.pathname;
  } catch {
    return null;
  }

  // Match /cipes/{id} (with optional additional path segments)
  const cipeMatch = pathname.match(/\/cipes\/([^/]+)/);
  if (cipeMatch) {
    return {
      type: 'cipe',
      cipeId: cipeMatch[1],
    };
  }

  // Match /runs/{id} with an optional /task/{taskId} suffix
  const runMatch = pathname.match(/\/runs\/([^/]+)(?:\/task\/(.+?))?(?:\/|$)/);
  if (runMatch) {
    const [, runId, taskId] = runMatch;
    return taskId
      ? { type: 'task', runId, taskId: decodeURIComponent(taskId) }
      : { type: 'run', runId };
  }

  return null;
}
