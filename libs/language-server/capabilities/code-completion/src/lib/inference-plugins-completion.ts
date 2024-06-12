import { lspLogger } from '@nx-console/language-server/utils';
import { getNxVersion } from '@nx-console/language-server/workspace';
import { workspaceDependencies } from '@nx-console/shared/npm';
import { existsSync } from 'fs';
import { join, posix, sep } from 'path';
import { CompletionItem } from 'vscode-json-languageservice';

let inferencePluginsCompletionCache: CompletionItem[] | undefined = undefined;

export async function inferencePluginsCompletion(
  workingPath: string | undefined
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  if (
    inferencePluginsCompletionCache &&
    inferencePluginsCompletionCache.length > 0
  ) {
    lspLogger.log('Returning cached inference plugins completion');
    return inferencePluginsCompletionCache;
  }

  const inferencePluginsCompletion: CompletionItem[] = [];
  const nxVersion = await getNxVersion(workingPath);
  const dependencies = await workspaceDependencies(workingPath, nxVersion);

  for (const dependency of dependencies) {
    const hasPluginJs = existsSync(join(dependency, 'plugin.js'));
    lspLogger.log('dependency: ', dependency);
    if (hasPluginJs) {
      const dependencyPath = dependency
        .replace(/\\/g, '/')
        .split('node_modules/')
        .pop();

      inferencePluginsCompletion.push({
        label: `${dependencyPath}/plugin`,
      });
    }
  }

  inferencePluginsCompletionCache = inferencePluginsCompletion;

  return inferencePluginsCompletion;
}

export async function resetInferencePluginsCompletionCache() {
  inferencePluginsCompletionCache = undefined;
}
