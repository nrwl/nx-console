import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { withTimeout } from './utils';

/**
 * Checks the provenance of the latest version of Nx from the npm registry.
 * Returns true if the provenance is valid, otherwise returns a string describing the failure reason.
 */
export async function nxLatestProvenanceCheck(): Promise<true | string> {
  try {
    const npmView = (
      await promisify(exec)(`npm view nx@latest --json`, {
        encoding: 'utf-8',
      })
    ).stdout.trim();

    const npmViewResult = JSON.parse(npmView);
    const attURL: string | undefined = npmViewResult.dist?.attestations?.url;

    if (!attURL) return 'No attestation URL found';

    const attestations = await withTimeout(
      async () => (await (await fetch(attURL)).json()) as any,
      10000,
    );

    const provenanceAttestation = attestations?.attestations?.find(
      (a) => a.predicateType === 'https://slsa.dev/provenance/v1',
    );
    if (!provenanceAttestation) return 'No provenance attestation found';

    const dsseEnvelopePayload = JSON.parse(
      atob(provenanceAttestation.bundle.dsseEnvelope.payload),
    );

    const workflowParameters =
      dsseEnvelopePayload?.predicate?.buildDefinition?.externalParameters
        ?.workflow;

    if (workflowParameters?.repository !== 'https://github.com/nrwl/nx') {
      return 'Repository does not match nrwl/nx';
    }
    if (workflowParameters?.path !== '.github/workflows/publish.yml') {
      return 'Publishing workflow does not match .github/workflows/publish.yml';
    }
    if (workflowParameters?.ref !== `refs/tags/${npmViewResult.version}`) {
      return `Version ref does not match refs/tags/${npmViewResult.version}`;
    }

    const distSha = Buffer.from(
      npmViewResult.dist.integrity.replace('sha512-', ''),
      'base64',
    ).toString('hex');
    const attestationSha = dsseEnvelopePayload?.subject[0]?.digest.sha512;
    if (distSha !== attestationSha) {
      return 'Integrity hash does not match attestation hash';
    }
    return true;
  } catch (e) {
    return `Error checking provenance: ${e instanceof Error ? e.message : e}`;
  }
}

export const noProvenanceError = `An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues`;
