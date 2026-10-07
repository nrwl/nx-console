import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pnpDependencies } from './pnp-dependencies';

describe('pnpDependencies', () => {
  let workspacePath: string;

  beforeAll(() => {
    workspacePath = mkdtempSync(join(tmpdir(), 'pnp-dependencies-'));
    // A stand-in for Yarn's .pnp.cjs that follows the PnP API, where
    // packageDependencies is a Map.
    writeFileSync(
      join(workspacePath, '.pnp.cjs'),
      `
      const cache = '/workspace/.yarn/cache';
      const virtualJs = '/workspace/.yarn/__virtual__/@nx-js-virtual-1/0/cache/@nx-js.zip/node_modules/@nx/js/';
      module.exports = {
        setup() {},
        getDependencyTreeRoots: () => [{ name: 'workspace', reference: 'workspace:.' }],
        getPackageInformation: () => ({
          packageDependencies: new Map([
            ['workspace', 'workspace:.'],
            ['@nx/js', 'virtual:abc#npm:22.7.8'],
            ['nx', 'npm:22.7.8'],
            ['missing-peer', null],
          ]),
        }),
        resolveToUnqualified: (name) =>
          name === '@nx/js' ? virtualJs : cache + '/' + name + '.zip/node_modules/' + name + '/',
        resolveVirtual: () => cache + '/@nx-js.zip/node_modules/@nx/js/',
      };
      `,
    );
  });

  afterAll(() => {
    rmSync(workspacePath, { recursive: true, force: true });
  });

  it('lists the paths of the workspace dependencies', async () => {
    expect(await pnpDependencies(workspacePath)).toEqual([
      '/workspace/.yarn/cache/@nx-js.zip/node_modules/@nx/js/',
      '/workspace/.yarn/cache/nx.zip/node_modules/nx/',
    ]);
  });
});
