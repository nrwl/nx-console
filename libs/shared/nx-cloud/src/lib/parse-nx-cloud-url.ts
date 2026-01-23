export interface ParsedCipeUrl {
  cipeId: string;
}

/**
 * Parse an Nx Cloud URL to extract the CIPE ID.
 *
 * Supported URL patterns (additional path segments and query params are ignored):
 * - /cipes/{id}[/...] → { cipeId }
 *
 * TODO: Add support for run URLs (/runs/{id}) and task URLs (/runs/{id}/task/{taskId})
 * once the API supports querying by linkId. Currently the API only supports querying
 * by executionId, which is not available in run/task URLs.
 *
 * @param url The Nx Cloud URL to parse
 * @returns Parsed URL info or null if URL doesn't match the CIPE pattern
 */
export function parseNxCloudUrl(url: string): ParsedCipeUrl | null {
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
      cipeId: cipeMatch[1],
    };
  }

  return null;
}
