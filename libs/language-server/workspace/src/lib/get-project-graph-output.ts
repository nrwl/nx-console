import { cacheDir } from '@nrwl/devkit';
import { join } from 'path';

export function getProjectGraphOutput(workspacePath: string) {
  const directory = join(cacheDir, 'nx-console-project-graph');
  const fullPath = `${directory}/project-graph.html`;
  return {
    directory,
    relativePath: '.' + fullPath.replace(workspacePath, ''),
    fullPath,
  };
}
