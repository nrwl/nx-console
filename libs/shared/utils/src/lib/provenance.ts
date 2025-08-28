import { execSync } from 'child_process';

export function nxLatestHasProvenance(): boolean {
  const npmView = execSync(
    `npm view nx@latest dist.attestations.provenance --json`,
    {
      encoding: 'utf-8',
    },
  ).trim();

  return npmView !== '';
}

export const noProvenanceError = `An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues`;
