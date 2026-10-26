import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import { importNxPackagePath } from '../workspace-dependencies';

export async function findMatchingProjects(
  projectsToRun: string | string[],
  projects: Record<string, ProjectGraphProjectNode>,
  workspacePath: string,
): Promise<string[]> {
  const { findMatchingProjects } = await importNxPackagePath<
    typeof import('nx/src/utils/find-matching-projects')
  >(workspacePath, 'src/utils/find-matching-projects');
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
