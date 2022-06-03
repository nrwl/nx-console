import { join } from 'path';
import { fileExists } from './utils';

/**
 * Builds the project path from the given project name.
 * @param workspacePath The full path to the configured workspace
 * @param projectPath The path to the project relative to the workspace
 * @returns The full path to the project.json file
 */
export async function buildProjectPath(
  workspacePath: string,
  projectPath: string
): Promise<string | undefined> {
  const basePath = join(workspacePath, projectPath);

  const projectJsonPath = join(basePath, 'project.json');
  const packageJsonPath = join(basePath, 'package.json');
  if (await fileExists(projectJsonPath)) {
    return projectJsonPath;
  } else if (await fileExists(packageJsonPath)) {
    return packageJsonPath;
  }
}
