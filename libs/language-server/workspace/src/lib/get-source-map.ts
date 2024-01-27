import { lspLogger } from '@nx-console/language-server/utils';
import { nxWorkspace } from './workspace';

let _sourceMapFilesToProjectMap: Record<string, string> | undefined = undefined;

/**
 * iterate over sourcemaps and return all files that were involved in creating a project along with the project name
 */
export async function getSourceMapFilesToProjectMap(
  workingPath: string
): Promise<Record<string, string>> {
  if (_sourceMapFilesToProjectMap) {
    return _sourceMapFilesToProjectMap;
  }
  const { workspace } = await nxWorkspace(workingPath);
  const sourceMapFilesToProjectMap: Record<string, string> = {};

  Object.entries(workspace.sourceMaps ?? {}).forEach(
    ([projectName, sourceMap]) => {
      Object.values(sourceMap).forEach(([file]) => {
        if (!sourceMapFilesToProjectMap[file]) {
          sourceMapFilesToProjectMap[file] = projectName;
        }
      });
    }
  );

  _sourceMapFilesToProjectMap = sourceMapFilesToProjectMap;
  return sourceMapFilesToProjectMap;
}

export function resetSourceMapFilesToProjectCache() {
  _sourceMapFilesToProjectMap = undefined;
}
