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

  // Match /runs/{id}/task/{taskId} (must check before plain /runs/{id})
  const taskMatch = pathname.match(/\/runs\/([^/]+)\/task\/(.+?)(?:\/|$)/);
  if (taskMatch) {
    return {
      type: 'task',
      runId: taskMatch[1],
      taskId: decodeURIComponent(taskMatch[2]),
    };
  }

  // Match /runs/{id} (with optional additional path segments)
  const runMatch = pathname.match(/\/runs\/([^/]+)/);
  if (runMatch) {
    return {
      type: 'run',
      runId: runMatch[1],
    };
  }

  return null;
}
