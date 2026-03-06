import type { CastFn } from './types'

/**
 * Return a CastFn that converts a value to number using Number().
 *
 * Reason for not using parseInt/parseFloat:
 * parseInt('123abc') returns 123, but Number('123abc') returns NaN,
 * ensuring reliable detection of invalid input
 */
export function asNumber(): CastFn<number> {
  return (value: unknown) => Number(value)
}
