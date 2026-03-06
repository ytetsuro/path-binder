import type { CastFn } from './types'

/**
 * Return a user-specified conversion function as-is as a CastFn.
 *
 * Reason for not wrapping:
 * Returning the user function directly eliminates overhead
 * and allows users to freely implement their own error handling
 */
export function asCustom<T>(fn: (value: unknown) => T): CastFn<T> {
  return fn
}
