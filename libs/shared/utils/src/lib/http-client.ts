export interface HttpOptions {
  url: string;
  type?: 'GET' | 'POST';
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
  followRedirects?: number;
}

export interface HttpResponse {
  responseText: string;
  status: number;
  headers: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public responseText: string,
    public headers: Record<string, string>,
  ) {
    super(`HTTP Error ${status}`);
    this.name = 'HttpError';
  }
}

export async function httpRequest(options: HttpOptions): Promise<HttpResponse> {
  const controller = new AbortController();
  const timeoutId = options.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : undefined;

  try {
    const response = await fetch(options.url, {
      method: options.type || 'GET',
      headers: options.headers,
      body: options.data,
      signal: controller.signal,
      redirect: options.followRedirects ? 'follow' : 'manual',
    });

    const responseText = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    if (!response.ok) {
      throw new HttpError(response.status, responseText, headers);
    }

    return {
      responseText,
      status: response.status,
      headers,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(0, 'Request timeout', {});
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
