import { findNxPackagePath } from '@nx-console/shared-npm';
import { NxVersion } from '@nx-console/nx-version';
import { coerce, SemVer } from 'semver';
import { readFileSync } from 'node:fs';

let nxWorkspacePackageJsonVersion: string | undefined;
let loadedNxPackage = false;

const defaultSemver = new SemVer('0.0.0');

export async function getNxVersion(
  workspacePath: string,
  reset = false,
): Promise<NxVersion> {
  if (!loadedNxPackage || reset) {
    const packagePath = await findNxPackagePath(workspacePath, 'package.json');

    if (!packagePath) {
      return {
        major: defaultSemver.major,
        minor: defaultSemver.minor,
        full: defaultSemver.version,
      };
    }

    nxWorkspacePackageJsonVersion = readVersionFromPackageJson(packagePath);
    loadedNxPackage = true;
  }

  if (!nxWorkspacePackageJsonVersion) {
    return {
      major: defaultSemver.major,
      minor: defaultSemver.minor,
      full: defaultSemver.version,
    };
  }
  const nxVersion = coerce(nxWorkspacePackageJsonVersion, {
    includePrerelease: true,
  });
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
  nxWorkspacePackageJsonVersion = undefined;
}

function readVersionFromPackageJson(packagePath: string) {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return undefined;
  }
}
