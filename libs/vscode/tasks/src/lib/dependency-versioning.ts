import { xhr } from 'request-light';
import { gte, rcompare } from 'semver';
import { QuickPickItem, QuickPickItemKind, window } from 'vscode';

type VersionMap = Record<string, { latest: string; all: string[] }>;

export async function resolveDependencyVersioning(
  depInput: string
): Promise<{ dep: string; version: string | undefined } | undefined> {
  const match = depInput.match(/^(.+)@(.+)/);
  if (match) {
    const [_, dep, version] = match;
    return { dep, version };
  }
  let packageInfo: PackageInformationResponse;
  try {
    packageInfo = await getPackageInfo(depInput);
  } catch (e) {
    window.showErrorMessage(
      `Package ${depInput} couldn't be found. Are you sure it exists?`
    );
    return { dep: depInput, version: undefined };
  }

  const versionMap = createVersionMap(packageInfo);
  const versionQuickPickOptions = createVersionQuickPickItems(versionMap);

  const version = await promptForVersion(versionQuickPickOptions, versionMap);

  return { dep: depInput, version };
}

async function promptForVersion(
  versionQuickPickItems: QuickPickItem[],
  versionMap: VersionMap
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
function createVersionMap(packageInfo: PackageInformationResponse): VersionMap {
  const versionMap: VersionMap = {};
  Object.entries(packageInfo.versions).forEach(([versionNum, versionInfo]) => {
    if (versionInfo.deprecated) {
      return;
    }
    const major = versionNum.split('.')[0];
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
 * For each major version, add the following options to the quickpick:
 *  - the latest version of that major
 *  - the patch before the latest version of that major
 *  - the minor before the latest version of that major
 *  - the option to select a specific version of that major
 */
function createVersionQuickPickItems(versionMap: VersionMap): QuickPickItem[] {
  return Object.entries(versionMap)
    .sort(
      (
        a: [keyof VersionMap, VersionMap[keyof VersionMap]],
        b: [keyof VersionMap, VersionMap[keyof VersionMap]]
      ) => (parseInt(a[0]) < parseInt(b[0]) ? 1 : -1)
    )
    .flatMap(([major, { latest, all }], index) => {
      const allSorted = all.sort(rcompare);
      const quickPickOptions = [];
      quickPickOptions.push({
        label: `Version ${major}.x`,
        kind: QuickPickItemKind.Separator,
      });
      quickPickOptions.push({
        label: latest,
        description: index === 0 ? 'latest' : '',
      });
      if (allSorted.length > 1) {
        quickPickOptions.push({ label: allSorted[1] });
      }
      const minorBefore = allSorted.find(
        (v) =>
          v.split('.')[1] === (parseInt(latest.split('.')[1]) - 1).toString()
      );
      if (minorBefore && minorBefore !== allSorted[1]) {
        quickPickOptions.push({ label: minorBefore });
      }
      if (allSorted.length > 2) {
        quickPickOptions.push({
          label: `${major}.x`,
          description: 'select specific version',
        });
      }
      return quickPickOptions;
    });
}

type PackageInformationResponse = {
  versions: Record<string, { deprecated: string }>;
};
function getPackageInfo(dep: string): Promise<PackageInformationResponse> {
  const headers = {
    'Accept-Encoding': 'gzip, deflate',
    Accept: 'application/vnd.npm.install-v1+json',
  };

  // https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
  return xhr({
    url: `https://registry.npmjs.org/${dep}`,
    headers,
  }).then(
    (res) => JSON.parse(res.responseText),
    (error) => Promise.reject(error)
  );
}
