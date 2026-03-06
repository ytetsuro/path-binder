import type { SchemaObject } from './types'

/**
 * Return the schema definition object as-is.
 *
 * Reason for returning without transformation or validation:
 * This is an identity function for type inference,
 * its purpose is to let TypeScript auto-infer the output type via type parameter T
 */
export function defineSchema<T extends SchemaObject>(definition: T): T {
  return definition
}
