import type { CastFn } from './types'

/**
 * Return a CastFn that converts a value to string using String().
 *
 * Reason for using String() instead of toString():
 * toString() throws on null/undefined,
 * while String() safely returns 'null'/'undefined'
 */
export function asString(): CastFn<string> {
  return (value: unknown) => String(value)
}
