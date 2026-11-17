/**
 * Refs in migrations.json are commit SHAs written by `nx migrate`. The file is
 * part of the workspace, so anything else is rejected before it reaches git.
 */
export function isCommitSha(ref: unknown): ref is string {
  return typeof ref === 'string' && /^[0-9a-f]{7,64}$/i.test(ref);
}
