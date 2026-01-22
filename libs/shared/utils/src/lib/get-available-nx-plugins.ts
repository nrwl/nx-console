import { gte, NxVersion } from '@nx-console/nx-version';
import { httpRequest, HttpError } from './http-client';

export type AvailableNxPlugin = {
  name: string;
  description: string;
  url?: string;
};

export async function getAvailableNxPlugins(
  nxVersion: NxVersion | undefined,
): Promise<{ official: AvailableNxPlugin[]; community: AvailableNxPlugin[] }> {
  try {
    const officialResponse = await httpRequest({
      url: 'https://raw.githubusercontent.com/nrwl/nx/master/docs/packages.json',
      followRedirects: 5,
    });

    const officialPlugins: AvailableNxPlugin[] = (
      JSON.parse(officialResponse.responseText) as {
        name: string;
        description: string;
      }[]
    )
      .filter(
        (pkg) =>
          pkg.name !== 'add-nx-to-monorepo' &&
          pkg.name !== 'cra-to-nx' &&
          pkg.name !== 'create-nx-plugin' &&
          pkg.name !== 'create-nx-workspace' &&
          pkg.name !== 'make-angular-cli-faster' &&
          pkg.name !== 'tao',
      )
      .map((pkg) => {
        let prefix: string;
        if (!nxVersion) {
          prefix = '@nx';
        } else if (gte(nxVersion, '16.0.0')) {
          prefix = '@nx';
        } else {
          prefix = '@nrwl';
        }

        return {
          name: `${prefix}/${pkg.name}`,
          description: pkg.description,
        };
      });

    let communityPlugins: AvailableNxPlugin[] = [];
    try {
      const communityResponse = await httpRequest({
        url: 'https://raw.githubusercontent.com/nrwl/nx/master/astro-docs/src/content/approved-community-plugins.json',
        followRedirects: 5,
      });
      communityPlugins = JSON.parse(communityResponse.responseText);
    } catch {
      // Community plugins fetch failed - continue without them
    }

    return {
      official: officialPlugins,
      community: communityPlugins,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return Promise.reject(error.responseText);
    }
    return Promise.reject(error);
  }
}
