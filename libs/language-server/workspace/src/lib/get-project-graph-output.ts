import { cacheDir } from 'nx/src/devkit-exports';
import { join, relative } from 'path';
import { normalize } from '@angular-devkit/core';

export function getProjectGraphOutput(workspacePath: string) {
  const directory = join(cacheDir, 'nx-console-project-graph');
  const fullPath = `${directory}/project-graph.html`;
  return {
    directory,
    relativePath: `./${normalize(relative(workspacePath, fullPath))}`,
    fullPath,
  };
}
