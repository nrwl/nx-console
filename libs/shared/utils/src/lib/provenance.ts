import { exec } from 'node:child_process';
import { promisify } from 'node:util';

export async function nxLatestHasProvenance(): Promise<boolean> {
  try {
    const npmView = (
      await promisify(exec)(`npm view nx@next --json`, {
        encoding: 'utf-8',
      })
    ).stdout.trim();

    const npmViewResult = JSON.parse(npmView);
    const attURL: string | undefined = npmViewResult.dist?.attestations?.url;

    if (!attURL) return false;

    const attestations = (await (await fetch(attURL)).json()) as any;

    const provenanceBundle = attestations?.attestations?.find(
      (a) => a.predicateType === 'https://slsa.dev/provenance/v1',
    ).bundle;

    const dsseEnvelopePayload = JSON.parse(
      atob(provenanceBundle.dsseEnvelope.payload),
    );

    const workflowParameters =
      dsseEnvelopePayload?.predicate?.buildDefinition?.externalParameters
        ?.workflow;

    if (workflowParameters?.repository !== 'https://github.com/nrwl/nx') {
      return false;
    }
    if (workflowParameters?.path !== '.github/workflows/publish.yml') {
      return false;
    }
    if (workflowParameters?.ref !== `refs/tags/${npmViewResult.version}`) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export const noProvenanceError = `An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues`;
