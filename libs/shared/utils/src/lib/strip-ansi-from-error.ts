import { stripVTControlCharacters } from 'node:util';

export function stripAnsiFromError<T>(error: T): T {
  if (typeof error === 'string') {
    return stripVTControlCharacters(error) as T;
  }
  if (Array.isArray(error)) {
    return error.map(stripAnsiFromError) as T;
  }
  if (error && typeof error === 'object') {
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
    return Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        stripAnsiFromError(value),
      ]),
    ) as T;
  }
  return error;
}
