import {
  findConfig,
  readAndCacheJsonFile,
} from '@nx-console/shared-file-system';
import { detectPackageManager } from '@nx-console/shared-npm';
import type { ProjectGraph } from 'nx/src/config/project-graph';
import { dirname, join } from 'path';

export type RootFileInfo = {
  mainFile: string;
  directory: string;
};

export type Configuration = {
  additionalRootFiles: RootFileInfo[];
  packageManager: string;
  workspacePackages: string[];
};
type CachedConfiguration = {
  additionalRootFiles: {
    count: number;
    stringified: string;
  };
  packageManager: string;
  workspacePackages: {
    count: number;
    stringified: string;
  };
};

const TSCONFIG_LIB = 'tsconfig.lib.json';
export const TSCONFIG_BASE = 'tsconfig.base.json';

async function getAdditionalRootFiles(
  workspaceRoot: string,
): Promise<RootFileInfo[]> {
  let tsconfig = (await readAndCacheJsonFile(TSCONFIG_BASE, workspaceRoot))
    .json;

  if (!tsconfig) {
    return [];
  }

  if (!('compilerOptions' in tsconfig)) {
    tsconfig = (await readAndCacheJsonFile('tsconfig.json', workspaceRoot))
      .json;
    if (!('compilerOptions' in tsconfig)) {
      return [];
    }
  }

  const paths = tsconfig.compilerOptions.paths ?? {};

  const rootFiles: RootFileInfo[] = [];

  for (const [, values] of Object.entries<string[]>(paths)) {
    for (const value of values) {
      const mainFile = join(workspaceRoot, value);

      const configFilePath = await findConfig(mainFile, TSCONFIG_LIB);

      if (!configFilePath) {
        continue;
      }

      if (mainFile.endsWith('/*') || mainFile.endsWith('\\*')) {
        // do nothing, we don't support wildcard paths in the plugin
      } else {
        const directory = dirname(configFilePath);
        rootFiles.push({ mainFile, directory });
      }
    }
  }

  return rootFiles;
}

export async function getPluginConfiguration(
  workspaceRoot: string,
  projectGraph?: ProjectGraph,
): Promise<Configuration> {
  const additionalRootFiles = await getAdditionalRootFiles(workspaceRoot);
  const packageManager = await detectPackageManager(workspaceRoot);

  if (!projectGraph) {
    return { additionalRootFiles, workspacePackages: [], packageManager };
  }

  const workspacePackages: string[] = [];
  for (const node of Object.values(projectGraph.nodes)) {
    if (!node.data.metadata?.js) {
      continue;
    }

    const { packageName, isInPackageManagerWorkspaces } = node.data.metadata.js;
    if (isInPackageManagerWorkspaces) {
      workspacePackages.push(packageName);
    }
  }

  return { additionalRootFiles, workspacePackages, packageManager };
}

export class PluginConfigurationCache {
  #cache: CachedConfiguration | undefined;

  store(result: Configuration) {
    const additionalRootFiles = result.additionalRootFiles.map(
      (x) => x.mainFile,
    );

    this.#cache = {
      additionalRootFiles: {
        count: additionalRootFiles.length,
        stringified: additionalRootFiles.sort().join('|'),
      },
      workspacePackages: {
        count: result.workspacePackages.length,
        stringified: result.workspacePackages.sort().join('|'),
      },
      packageManager: result.packageManager,
    };
  }

  matchesCachedResult(result: Configuration): boolean {
    if (!this.#cache) {
      return false;
    }
    if (
      this.#cache.additionalRootFiles.count !==
      result.additionalRootFiles.length
    ) {
      return false;
    }
    if (
      this.#cache.additionalRootFiles.stringified !==
      result.additionalRootFiles
        .map((x) => x.mainFile)
        .sort()
        .join('|')
    ) {
      return false;
    }
    if (
      this.#cache.workspacePackages.count !== result.workspacePackages.length
    ) {
      return false;
    }
    if (
      this.#cache.workspacePackages.stringified !==
      result.workspacePackages.sort().join('|')
    ) {
      return false;
    }
    if (this.#cache.packageManager !== result.packageManager) {
      return false;
    }
    return true;
  }
}
