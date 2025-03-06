import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import { join } from 'path';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '../workspace-dependencies';

export async function findMatchingProjects(
  projectsToRun: string | string[],
  projects: Record<string, ProjectGraphProjectNode>,
  workspacePath: string,
): Promise<string[]> {
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath) {
    throw 'local nx dependency not found';
  }
  const importPath = join(nxPath, 'src/utils/find-matching-projects');
  const { findMatchingProjects } =
    await importWorkspaceDependency<
      typeof import('nx/src/utils/find-matching-projects')
    >(importPath);
  const projectsArray = Array.isArray(projectsToRun)
    ? projectsToRun
    : [projectsToRun];
  return findMatchingProjects(projectsArray, projects);
}

export async function findMatchingProject(
  projectName: string,
  projects: Record<string, ProjectGraphProjectNode>,
  workspacePath: string,
): Promise<ProjectGraphProjectNode | undefined> {
  const matchingProjects = await findMatchingProjects(
    projectName,
    projects,
    workspacePath,
  );
  return matchingProjects.length > 0
    ? projects[matchingProjects[0]]
    : undefined;
}
