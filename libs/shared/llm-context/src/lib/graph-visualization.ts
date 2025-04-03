/**
 * Creates a standard response message for project graph visualization
 */
export function getProjectGraphVisualizationMessage(
  projectName?: string,
): string {
  if (projectName) {
    return `Opening project graph for ${projectName}. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.`;
  }
  return 'Opening full project graph. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.';
}

/**
 * Creates a standard response message for task graph visualization
 */
export function getTaskGraphVisualizationMessage(
  projectName: string,
  taskName: string,
): string {
  return `Opening graph focused on task ${taskName} for project ${projectName}. There can only be one graph visualization open at a time so avoid similar tool calls unless the user specifically requests it.`;
}
