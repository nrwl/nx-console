import { stripVTControlCharacters } from 'node:util';

export function stripAnsiFromError<T>(
  error: T,
  ancestors = new WeakSet<object>(),
): T {
  if (typeof error === 'string') {
    return stripVTControlCharacters(error) as T;
  }
  if (Array.isArray(error)) {
    return error.map((item) => stripAnsiFromError(item, ancestors)) as T;
  }
  if (error && typeof error === 'object') {
    // plugin errors can carry circular objects (e.g. HTTP requests) in `cause`
    if (ancestors.has(error)) {
      return undefined as T;
    }
    ancestors.add(error);
    const properties =
      error instanceof Error
        ? {
            ...error,
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...('cause' in error ? { cause: error.cause } : {}),
            ...('errors' in error ? { errors: error.errors } : {}),
          }
        : error;
    const stripped = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        stripAnsiFromError(value, ancestors),
      ]),
    );
    ancestors.delete(error);
    return stripped as T;
  }
  return error;
}
