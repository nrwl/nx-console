/**
 * Surrounds a string with quotes if it contains whitespace or starts with special characters like '#'
 * This is needed for CLI command construction where project/target names might need escaping
 */
export function surroundWithQuotesIfNeeded(value: string): string {
  if (value.match(/\s/g) || value.startsWith('#')) {
    return `"${value}"`;
  }
  return value;
}

/**
 * Creates a properly quoted project:target string for Nx CLI commands
 * Quotes the entire string if the project name contains special characters or whitespace
 */
export function createProjectTargetString(
  projectName: string, 
  targetName: string, 
  configuration?: string
): string {
  const projectTargetString = configuration 
    ? `${projectName}:${targetName}:${configuration}`
    : `${projectName}:${targetName}`;
    
  return surroundWithQuotesIfNeeded(projectTargetString);
}