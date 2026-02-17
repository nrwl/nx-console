import { httpRequest, HttpError, HttpOptions } from '@nx-console/shared-utils';

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
    return await httpRequest(options);
  } catch (error) {
    sanitizeNxCloudError(error, options.url, endpointLabel);
    throw error;
  }
}
