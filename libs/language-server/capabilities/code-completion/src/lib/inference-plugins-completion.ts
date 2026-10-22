import { getNxVersion } from '@nx-console/shared-nx-workspace-info';
import { workspaceDependencies } from '@nx-console/shared-npm';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CompletionItem } from 'vscode-json-languageservice';
let inferencePluginsCompletionCache: CompletionItem[] | undefined = undefined;

export async function inferencePluginsCompletion(
  workingPath: string | undefined,
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  if (
    inferencePluginsCompletionCache &&
    inferencePluginsCompletionCache.length > 0
  ) {
    return inferencePluginsCompletionCache;
  }

  const inferencePluginsCompletion: CompletionItem[] = [];
  const nxVersion = await getNxVersion(workingPath);
  const dependencies = await workspaceDependencies(workingPath, nxVersion);

  for (const dependency of dependencies) {
    if (await hasPluginEntryPoint(dependency)) {
      const dependencyPath = dependency
        .replace(/\\/g, '/')
        .split('node_modules/')
        .pop();

      if (dependencyPath?.includes('nx')) {
        inferencePluginsCompletion.push({
          label: `${dependencyPath}/plugin`,
        });
      }
    }
  }

  inferencePluginsCompletionCache = inferencePluginsCompletion;

  return inferencePluginsCompletion;
}

// Since Nx 23, plugins ship their entry points under dist/ and expose them via package.json exports
async function hasPluginEntryPoint(dependency: string): Promise<boolean> {
  if (existsSync(join(dependency, 'plugin.js'))) {
    return true;
  }
  try {
    const { exports } = JSON.parse(
      await readFile(join(dependency, 'package.json'), 'utf-8'),
    );
    return (
      typeof exports === 'object' && exports !== null && './plugin' in exports
    );
  } catch {
    return false;
  }
}

export async function resetInferencePluginsCompletionCache() {
  inferencePluginsCompletionCache = undefined;
}
