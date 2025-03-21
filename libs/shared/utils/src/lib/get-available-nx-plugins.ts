import { gte, NxVersion } from '@nx-console/nx-version';
import { xhr, XHRResponse } from 'request-light';

type AvailableNxPlugin = {
  name: string;
  description: string;
  url?: string;
};

export async function getAvailableNxPlugins(
  nxVersion: NxVersion | undefined,
): Promise<{ official: AvailableNxPlugin[]; community: AvailableNxPlugin[] }> {
  const headers = { 'Accept-Encoding': 'gzip, deflate' };

  try {
    const officialResponse = await xhr({
      url: 'https://raw.githubusercontent.com/nrwl/nx/master/docs/packages.json',
      followRedirects: 5,
      headers,
    });

    const communityResponse = await xhr({
      url: 'https://raw.githubusercontent.com/nrwl/nx/master/community/approved-plugins.json',
      followRedirects: 5,
      headers,
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

    const communityPlugins: AvailableNxPlugin[] = JSON.parse(
      communityResponse.responseText,
    );

    return {
      official: officialPlugins,
      community: communityPlugins,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'responseText' in error) {
      return Promise.reject((error as XHRResponse).responseText);
    }
    return Promise.reject(error);
  }
}
