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
    const dependencyPath = dependency
      .replace(/\\/g, '/')
      .split('node_modules/')
      .pop();

    if (!dependencyPath?.includes('nx')) {
      continue;
    }

    const packageJson = await readPackageJson(dependency);
    if (hasPluginEntryPoint(dependency, packageJson)) {
      inferencePluginsCompletion.push({
        label: `${dependencyPath}/plugin`,
      });
    } else if (await rootEntryExportsCreateNodes(dependency, packageJson)) {
      inferencePluginsCompletion.push({
        label: dependencyPath,
      });
    }
  }

  inferencePluginsCompletionCache = inferencePluginsCompletion;

  return inferencePluginsCompletion;
}

// Since Nx 23, plugins ship their entry points under dist/ and expose them via package.json exports
function hasPluginEntryPoint(
  dependency: string,
  packageJson: PackageJson | undefined,
): boolean {
  if (existsSync(join(dependency, 'plugin.js'))) {
    return true;
  }
  const exports = packageJson?.exports;
  return (
    typeof exports === 'object' && exports !== null && './plugin' in exports
  );
}

// Some plugins (e.g. @nx/vitest) export createNodes from the package root and are registered by their bare name
async function rootEntryExportsCreateNodes(
  dependency: string,
  packageJson: PackageJson | undefined,
): Promise<boolean> {
  if (!packageJson) {
    return false;
  }
  const exports = packageJson.exports;
  const rootExport =
    typeof exports === 'object' && exports !== null && !Array.isArray(exports)
      ? (exports as Record<string, unknown>)['.']
      : exports;
  const rootEntry =
    resolveExportTarget(rootExport) ?? packageJson.main ?? 'index.js';
  try {
    const source = await readFile(join(dependency, rootEntry), 'utf-8');
    return /\bexports\.createNodes(V2)?\b/.test(source);
  } catch {
    return false;
  }
}

function resolveExportTarget(target: unknown): string | undefined {
  if (typeof target === 'string') {
    return target;
  }
  if (typeof target === 'object' && target !== null) {
    const conditions = target as Record<string, unknown>;
    return (
      resolveExportTarget(conditions['require']) ??
      resolveExportTarget(conditions['node']) ??
      resolveExportTarget(conditions['default'])
    );
  }
  return undefined;
}

type PackageJson = { main?: string; exports?: unknown };

async function readPackageJson(
  dependency: string,
): Promise<PackageJson | undefined> {
  try {
    return JSON.parse(
      await readFile(join(dependency, 'package.json'), 'utf-8'),
    );
  } catch {
    return undefined;
  }
}

export async function resetInferencePluginsCompletionCache() {
  inferencePluginsCompletionCache = undefined;
}
