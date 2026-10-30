import { httpRequest, HttpError, HttpOptions } from '@nx-console/shared-utils';
import { nxCloudAuthHeadersAfterOAuthRejection } from './nx-cloud-auth-headers';
import {
  isNxCloudOAuthAccessTokenRejection,
  NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER,
} from './nx-cloud-oauth';

export function sanitizeNxCloudError(
  error: unknown,
  requestUrl: string,
  endpointLabel: string,
): unknown {
  let origin: string;
  try {
    origin = new URL(requestUrl).origin;
  } catch {
    return error;
  }

  if (error instanceof Error) {
    if (error.message) {
      error.message = error.message
        .replaceAll(requestUrl, `{${endpointLabel}}`)
        .replaceAll(origin, '{NX_CLOUD_URL}');
    }
    if (error.stack) {
      error.stack = error.stack
        .replaceAll(requestUrl, `{${endpointLabel}}`)
        .replaceAll(origin, '{NX_CLOUD_URL}');
    }
    if (error instanceof HttpError && error.responseText) {
      error.responseText = error.responseText
        .replaceAll(requestUrl, `{${endpointLabel}}`)
        .replaceAll(origin, '{NX_CLOUD_URL}');
    }
  }

  return error;
}

export async function nxCloudRequest(
  endpointLabel: string,
  options: HttpOptions,
) {
  try {
    try {
      return await httpRequest(options);
    } catch (error) {
      // like the nx-cloud client, replay a request once with fresh credentials
      // when Nx Cloud rejected its OAuth access token
      const retryOptions = await optionsAfterOAuthRejection(error, options);
      if (!retryOptions) {
        throw error;
      }
      return await httpRequest(retryOptions);
    }
  } catch (error) {
    sanitizeNxCloudError(error, options.url, endpointLabel);
    throw error;
  }
}

async function optionsAfterOAuthRejection(
  error: unknown,
  options: HttpOptions,
): Promise<HttpOptions | undefined> {
  const accessToken = options.headers?.[NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER];
  if (
    !accessToken ||
    !(error instanceof HttpError) ||
    !isNxCloudOAuthAccessTokenRejection(error.status, error.responseText)
  ) {
    return undefined;
  }
  const authHeaders = await nxCloudAuthHeadersAfterOAuthRejection(accessToken);
  if (!authHeaders) {
    return undefined;
  }
  const headers = { ...options.headers };
  delete headers[NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER];
  delete headers['Nx-Cloud-Personal-Access-Token'];
  return { ...options, headers: { ...headers, ...authHeaders } };
}
