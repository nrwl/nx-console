import { TargetConfiguration } from 'nx/src/devkit-exports';
import { nxWorkspace } from './workspace';
import { normalize, relative } from 'path';
import { lspLogger } from '@nx-console/language-server/utils';

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
    ([projectRoot, sourceMap]) => {
      Object.values(sourceMap).forEach(([file]) => {
        if (!sourceMapFilesToProjectMap[file]) {
          sourceMapFilesToProjectMap[file] = projectRoot;
        }
      });
    }
  );

  _sourceMapFilesToProjectMap = sourceMapFilesToProjectMap;
  return sourceMapFilesToProjectMap;
}

export async function getTargetsForConfigFile(
  projectName: string,
  configFilePath: string,
  workingPath: string
): Promise<Record<string, TargetConfiguration> | undefined> {
  const {
    workspace: { sourceMaps, projects },
  } = await nxWorkspace(workingPath);

  configFilePath = normalize(configFilePath);

  if (configFilePath.includes(workingPath)) {
    configFilePath = relative(workingPath, configFilePath);
  }

  const project = projects[projectName];

  if (!project || !sourceMaps) {
    return;
  }

  const sourceMap = sourceMaps[project.root];

  const targets: Record<string, TargetConfiguration> = {};
  Object.entries(sourceMap)
    .filter(([key]) => key.startsWith('targets.'))
    .forEach(([key, [file]]: [string, string[]]) => {
      if (normalize(file) === configFilePath) {
        const targetName = key.split('.')[1];
        const target = project.targets?.[targetName];
        if (target) {
          targets[targetName] = target;
        }
      }
    });

  return targets;
}

export function resetSourceMapFilesToProjectCache() {
  _sourceMapFilesToProjectMap = undefined;
}
