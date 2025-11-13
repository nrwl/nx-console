import { gte } from '@nx-console/nx-version';
import { httpRequest } from '@nx-console/shared-utils';
import { rcompare } from 'semver';
import { QuickPickItem, QuickPickItemKind, window } from 'vscode';
import { join } from 'path';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import * as fs from 'fs';

type VersionMap = Record<string, { latest: string; all: string[] }>;

export async function resolveDependencyVersioning(
  depInput: string,
): Promise<{ dep: string; version: string | undefined } | undefined> {
  const match = depInput.match(/^(.+)@(.+)/);
  if (match) {
    const [_, dep, version] = match;
    return { dep, version };
  }

  // Special handling for Nx packages
  if (depInput.startsWith('@nx/')) {
    try {
      const nxVersion = await getNxVersionFromPackageJson();
      if (nxVersion) {
        const options: QuickPickItem[] = [
          {
            label: nxVersion,
            description: "matches 'nx' package",
          },
          {
            label: 'Choose another version',
            description: '',
          },
        ];

        const selection = await window.showQuickPick(options, {
          placeHolder: `Select version for ${depInput}`,
        });

        if (!selection) {
          return undefined;
        }

        if (selection.label === nxVersion) {
          return { dep: depInput, version: nxVersion };
        }
      }
    } catch (e) {
      console.error('Error finding Nx version:', e);
    }
  }

  // Get package info and show the full version picker
  const packageInfo = await getPackageInfo(depInput);
  const versionMap = createVersionMap(packageInfo);
  const versionQuickPickOptions = createVersionQuickPickItems(
    packageInfo,
    versionMap,
  );
  const version = await promptForVersion(versionQuickPickOptions, versionMap);
  if (!version) {
    return undefined;
  }
  return { dep: depInput, version };
}

async function getNxVersionFromPackageJson(): Promise<string | undefined> {
  const workspacePath = getNxWorkspacePath();
  if (!workspacePath) {
    return undefined;
  }

  const packageJsonPath = join(workspacePath, 'package.json');

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    // Check for 'nx' in dependencies or devDependencies
    const nxVersion =
      (packageJson.dependencies && packageJson.dependencies.nx) ||
      (packageJson.devDependencies && packageJson.devDependencies.nx);

    // Skip if it's a canary version
    if (nxVersion && nxVersion.includes('canary')) {
      return undefined;
    }

    return nxVersion;
  } catch (e) {
    console.error('Error reading package.json:', e);
    return undefined;
  }
}

async function promptForVersion(
  versionQuickPickItems: QuickPickItem[],
  versionMap: VersionMap,
): Promise<string | undefined> {
  const selection = await new Promise<string | undefined>((resolve) => {
    const quickPick = window.createQuickPick();
    quickPick.canSelectMany = false;

    quickPick.items = versionQuickPickItems;

    quickPick.onDidChangeValue(() => {
      quickPick.items = [
        ...versionQuickPickItems,
        {
          label: quickPick.value,
          description: 'install specific version',
        },
      ];
    });

    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0]?.label);
      quickPick.hide();
      quickPick.dispose();
    });

    quickPick.show();
  });
  const match = selection?.match(/^(\d+).x/);
  if (match) {
    const majorToSelect = match[1];
    const version = await window.showQuickPick(versionMap[majorToSelect].all, {
      canPickMany: false,
    });
    if (!version) {
      return promptForVersion(versionQuickPickItems, versionMap);
    }
    return version;
  }
  return selection;
}

/**
 * Create a map that tracks the latest version and an array of all versions per major version
 */
export function createVersionMap(
  packageInfo: PackageInformationResponse,
): VersionMap {
  const versionMap: VersionMap = {};
  Object.entries(packageInfo.versions).forEach(([versionNum, versionInfo]) => {
    // Skip deprecated versions or canary versions
    if (versionInfo.deprecated || versionNum.includes('canary')) {
      return;
    }
    const major = versionNum.split('.')[0];
    if (major === '0') {
      return;
    }
    if (!versionMap[major]) {
      versionMap[major] = { latest: versionNum, all: [] };
    }
    versionMap[major].all.push(versionNum);
    if (gte(versionNum, versionMap[major].latest)) {
      versionMap[major].latest = versionNum;
    }
  });
  return versionMap;
}

/**
 * For each major version, add options to the quickpick based on the updated requirements:
 * - next version if it exists
 * - latest version if it exists
 * - highest version if it's different from latest
 * - highest version one minor behind the highest
 * - option to select a specific version
 */
function createVersionQuickPickItems(
  packageInfo: PackageInformationResponse,
  versionMap: VersionMap,
): QuickPickItem[] {
  // Get next and latest tags
  const nextTag = packageInfo['dist-tags']?.next;
  const latestTag = packageInfo['dist-tags']?.latest;

  // Skip tags if they are canary versions
  const validNextTag = nextTag && !nextTag.includes('canary') ? nextTag : null;
  const validLatestTag =
    latestTag && !latestTag.includes('canary') ? latestTag : null;

  return Object.entries(versionMap)
    .sort(
      (
        a: [keyof VersionMap, VersionMap[keyof VersionMap]],
        b: [keyof VersionMap, VersionMap[keyof VersionMap]],
      ) => (parseInt(a[0]) < parseInt(b[0]) ? 1 : -1),
    )
    .flatMap(([major, { latest, all }], index) => {
      const allSorted = all.sort(rcompare);
      const quickPickOptions = [];

      quickPickOptions.push({
        label: `Version ${major}.x`,
        kind: QuickPickItemKind.Separator,
      });

      // Add 'next' version if it exists and belongs to this major
      if (validNextTag && validNextTag.startsWith(`${major}.`)) {
        quickPickOptions.push({
          label: validNextTag,
          description: 'next',
        });
      }

      // Add 'latest' version if it exists and belongs to this major
      if (validLatestTag && validLatestTag.startsWith(`${major}.`)) {
        quickPickOptions.push({
          label: validLatestTag,
          description: 'latest',
        });
      }

      // Add the highest version if it's not already covered by next/latest
      const highestVersion = allSorted[0];
      if (
        highestVersion !== validNextTag &&
        highestVersion !== validLatestTag
      ) {
        quickPickOptions.push({
          label: highestVersion,
          description: '',
        });
      }

      // Add the version that's one minor behind the highest
      const minorBefore = allSorted.find(
        (v) =>
          v.split('.')[1] ===
          (parseInt(highestVersion.split('.')[1]) - 1).toString(),
      );

      if (
        minorBefore &&
        minorBefore !== validNextTag &&
        minorBefore !== validLatestTag
      ) {
        quickPickOptions.push({
          label: minorBefore,
          description: '',
        });
      }

      // Add option to select specific version
      if (allSorted.length > 1) {
        quickPickOptions.push({
          label: `${major}.x`,
          description: 'select specific version',
        });
      }

      return quickPickOptions;
    });
}

export type PackageInformationResponse = {
  versions: Record<string, { deprecated?: string }>;
  'dist-tags': Record<string, string>;
};
export function getPackageInfo(
  dep: string,
): Promise<PackageInformationResponse> {
  const headers = {
    Accept: 'application/vnd.npm.install-v1+json',
  };

  // https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
  return httpRequest({
    url: `https://registry.npmjs.org/${dep}`,
    headers,
  }).then(
    (res) => JSON.parse(res.responseText),
    (error) => Promise.reject(error),
  );
}
