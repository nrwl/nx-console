import { cacheDir } from '@nrwl/devkit';

export function getProjectGraphOutput(workspacePath: string) {
  const directory = cacheDir ?? '.';
  const fullPath = `${directory}/project-graph.html`;
  return {
    directory,
    relativePath: '.' + fullPath.replace(workspacePath, ''),
    fullPath,
  };
}
