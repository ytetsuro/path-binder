import type { CastFn } from './types'

/**
 * Return a CastFn that converts a value to a Date object using new Date().
 *
 * Reason for using new Date() instead of Date.parse():
 * Date.parse() returns a number (milliseconds), but CastFn<Date> needs to return a Date object
 *
 * Reason for using `as string | number` type assertion:
 * new Date() accepts string | number, but CastFn's argument is unknown,
 * so an assertion is needed to pass TypeScript's type check.
 * Invalid values (objects, etc.) will produce an Invalid Date
 */
export function asDate(): CastFn<Date> {
  return (value: unknown) => new Date(value as string | number)
}
