import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { loadRootEnvFiles } from './loadRootEnvFiles';

export async function nxLatestProvenanceCheck(
  workspacePath?: string,
): Promise<true | string> {
  const env = workspacePath ? loadRootEnvFiles(workspacePath) : process.env;

  if (env.NX_SKIP_PROVENANCE_CHECK === 'true') {
    return true;
  }
  try {
    const npmView = (
      await promisify(exec)(`npm view nx@latest --json --silent`, {
        encoding: 'utf-8',
      })
    ).stdout.trim();

    const npmViewResult = JSON.parse(npmView);
    const attURL: string | undefined = npmViewResult.dist?.attestations?.url;

    if (!attURL) return 'No attestation URL found';

    let attestations;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000);

    try {
      const response = await fetch(attURL, { signal: abortController.signal });
      clearTimeout(timeoutId);
      attestations = await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }

    const provenanceAttestation = attestations?.attestations?.find(
      (a) => a.predicateType === 'https://slsa.dev/provenance/v1',
    );
    if (!provenanceAttestation) return 'No provenance attestation found';

    const dsseEnvelopePayload = JSON.parse(
      Buffer.from(
        provenanceAttestation.bundle.dsseEnvelope.payload,
        'base64',
      ).toString(),
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
    const attestationSha = dsseEnvelopePayload?.subject[0]?.digest?.sha512;
    if (distSha !== attestationSha) {
      return 'Integrity hash does not match attestation hash';
    }
    return true;
  } catch (e) {
    return `Error checking provenance: ${e instanceof Error ? e.message : e}`;
  }
}

export const noProvenanceError = `An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues`;
