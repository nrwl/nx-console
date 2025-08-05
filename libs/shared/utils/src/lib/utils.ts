export function getPrimitiveValue(value: any): string | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value.toString();
  } else {
    return undefined;
  }
}

export function hasKey<T extends object>(
  obj: T,
  key: PropertyKey,
): key is keyof T {
  return key in obj;
}

export function formatError(message: string, err: any): string {
  if (err instanceof Error) {
    const error = <Error>err;
    return `${message}: ${error.message}\n${error.stack}`;
  } else if (typeof err === 'string') {
    return `${message}: ${err}`;
  } else if (err) {
    return `${message}: ${err.toString()}`;
  }
  return message;
}

export function matchWithWildcards(
  text: string,
  expression: string,
  strict = true,
) {
  const escapeRegex = (str: string) =>
    str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
  return new RegExp(
    `${strict ? '^' : ''}${expression.split('*').map(escapeRegex).join('.*')}$`,
  ).test(text);
}

export function debounce(callback: (...args: any[]) => any, wait: number) {
  let timerId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      return callback(...args);
    }, wait);
  };
}

/**
 * Creates a throttled function that doesn't do anything if the function is called again within the `wait` milliseconds.
 *
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 *
 * @example
 * ```typescript
 * const throttledRefresh = throttle(() => {
 *   console.log('Refreshing...');
 * }, 1000);
 *
 * // This will only execute once, even if called multiple times
 * throttledRefresh();
 * throttledRefresh();
 * throttledRefresh();
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T {
  let lastCallTime = 0;

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();

    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= wait) {
      // Execute immediately if enough time has passed
      lastCallTime = now;
      return func(...args);
    } else {
      // do nothing
    }
  }) as T;

  return throttled;
}

export function withTimeout<T>(
  asyncFn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Function timed out after ${timeoutMs} milliseconds`));
    }, timeoutMs);

    asyncFn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
