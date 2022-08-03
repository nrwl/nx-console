import { workspaceDependencyPath } from '@nx-console/npm';

declare function __non_webpack_require__(importPath: string): any;

let ngPackageJson: { version: string };
let loadedNgPackage = false;

export async function ngVersion(workspacePath: string): Promise<number> {
  if (!loadedNgPackage) {
    const packagePath = await workspaceDependencyPath(
      workspacePath,
      '@angular/cli'
    );

    if (!packagePath) {
      return 0;
    }

    ngPackageJson = __non_webpack_require__(packagePath + '/package.json');
    loadedNgPackage = true;
  }

  if (!ngPackageJson) {
    return 0;
  }
  const ngPackageVersion = ngPackageJson.version;
  const majorVersion = ngPackageVersion.split('.')[0];
  if (!majorVersion) {
    return 0;
  }
  return +majorVersion;
}
