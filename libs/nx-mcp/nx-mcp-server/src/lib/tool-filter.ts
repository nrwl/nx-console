import { minimatch } from 'minimatch';

/**
 * Determines if a tool is enabled based on the provided filter patterns.
 *
 * Filter patterns support glob syntax including negation:
 * - "*" matches all tools
 * - "nx_*" matches tools starting with "nx_"
 * - "!nx_docs" excludes the nx_docs tool
 * - "cloud_*" matches all cloud tools
 *
 * Logic:
 * - If no filter is provided (empty or undefined), all tools are enabled
 * - Positive patterns (without !) include matching tools
 * - Negative patterns (with !) exclude matching tools
 * - A tool is enabled if it matches at least one positive pattern
 *   and doesn't match any negative pattern
 * - If only negative patterns are provided, tools not matching them are enabled
 */
export function isToolEnabled(
  toolName: string,
  toolsFilter: string[] | undefined,
): boolean {
  if (!toolsFilter || toolsFilter.length === 0) {
    return true;
  }

  const positivePatterns = toolsFilter.filter((p) => !p.startsWith('!'));
  const negativePatterns = toolsFilter
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1));

  const matchesNegative = negativePatterns.some((pattern) =>
    minimatch(toolName, pattern),
  );
  if (matchesNegative) {
    return false;
  }

  if (positivePatterns.length === 0) {
    return true;
  }

  return positivePatterns.some((pattern) => minimatch(toolName, pattern));
}
