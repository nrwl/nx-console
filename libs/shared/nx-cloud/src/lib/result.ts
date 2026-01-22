/**
 * Represents a successful result with data.
 */
export interface SuccessResult<T> {
  data: T;
  error?: never;
}

/**
 * Represents a failed result with an error.
 */
export interface ErrorResult<E> {
  data?: never;
  error: E;
}

/**
 * A discriminated union type for results that can either succeed with data or fail with an error.
 * When `data` is present, `error` is not, and vice versa.
 */
export type Result<T, E> = SuccessResult<T> | ErrorResult<E>;
