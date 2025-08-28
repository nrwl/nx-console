import { exec } from 'node:child_process';
import { promisify } from 'node:util';

export async function nxLatestHasProvenance(): Promise<boolean> {
  const npmView = (
    await promisify(exec)(
      `npm view nx@latest dist.attestations.provenance --json`,
      {
        encoding: 'utf-8',
      },
    )
  ).stdout.trim();

  return npmView !== '';
}

export const noProvenanceError = `An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues`;
