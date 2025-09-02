import { exec } from 'node:child_process';
import { verify, VerifyOptions } from 'sigstore';
import { promisify } from 'node:util';
import { xhr } from 'request-light';
import { createHash } from 'node:crypto';

const pacote = require('pacote');

export async function nxLatestHasProvenance(): Promise<boolean> {
  try {
    const npmView = (
      await promisify(exec)(`npm view nx@latest dist --json`, {
        encoding: 'utf-8',
      })
    ).stdout.trim();

    const dist = JSON.parse(npmView);
    const attURL: string | undefined = dist?.attestations?.url;
    const tarballURL: string | undefined = dist?.tarball;

    if (!attURL || !tarballURL) return false;

    const [attestations, tarball] = await Promise.all([
      getJSON<any>(attURL),
      getBinary(tarballURL),
    ]);

    pacote;

    const bundle = attestations?.attestations?.find(
      (a) => a.predicateType === 'https://slsa.dev/provenance/v1',
    ).bundle;

    const sha = createHash('sha512').update(tarball).digest('hex');
    const payload = JSON.parse(atob(bundle.dsseEnvelope.payload));

    const result = await pacote.manifest(`nx@21.4.1`, {
      verifySignatures: true,
      verifyAttestations: true,
    });

    const verifyOpts: VerifyOptions = {
      certificateIssuer: 'https://token.actions.githubusercontent.com',
    };

    await verify(bundle, verifyOpts);
    return true;
  } catch (e) {
    return false;
  }
}

async function getJSON<T = unknown>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return (await r.json()) as T;
}

async function getBinary(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

export const noProvenanceError = `An error occurred while checking the integrity of the latest version of Nx. This shouldn't happen. Please file an issue at https://github.com/nrwl/nx-console/issues`;
