import { findNxPackagePath } from '@nx-console/shared/npm';
import { NxVersion } from '@nx-console/shared/types';
import { coerce, SemVer } from 'semver';

let nxWorkspacePackageJson: { version: string } | undefined;
let loadedNxPackage = false;

const defaultSemver = new SemVer('0.0.0');

export async function getNxVersion(workspacePath: string): Promise<NxVersion> {
  if (!loadedNxPackage) {
    const packagePath = await findNxPackagePath(workspacePath, 'package.json');

    if (!packagePath) {
      return {
        major: defaultSemver.major,
        minor: defaultSemver.minor,
        full: defaultSemver.version,
      };
    }

    nxWorkspacePackageJson = require(packagePath);
    loadedNxPackage = true;
  }

  if (!nxWorkspacePackageJson) {
    return {
      major: defaultSemver.major,
      minor: defaultSemver.minor,
      full: defaultSemver.version,
    };
  }
  const nxVersion = coerce(nxWorkspacePackageJson.version);
  if (!nxVersion) {
    return {
      major: defaultSemver.major,
      minor: defaultSemver.minor,
      full: defaultSemver.version,
    };
  }

  return {
    major: nxVersion.major,
    minor: nxVersion.minor,
    full: nxVersion.version,
  };
}

export async function resetNxVersionCache() {
  loadedNxPackage = false;
  nxWorkspacePackageJson = undefined;
}
