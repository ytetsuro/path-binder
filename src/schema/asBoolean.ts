import type { CastFn } from './types'

/**
 * Return a CastFn that converts a value to boolean using Boolean().
 *
 * Reason for using Boolean() instead of !! operator:
 * More explicit in intent, making the conversion purpose clear during code review
 *
 * Note: Follows JavaScript's standard Boolean() conversion,
 * so the string "false" is truthy and returns true.
 * If "false" → false is needed, define a custom conversion function with asCustom
 */
export function asBoolean(): CastFn<boolean> {
  return (value: unknown) => Boolean(value)
}
