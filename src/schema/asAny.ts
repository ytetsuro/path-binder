import type { AnySchema, SchemaObject } from './types'
import { SCHEMA_TYPE } from './symbol'

/**
 * Generate an AnySchema.
 * When properties are specified, cast functions are applied to those properties,
 * creating a "loose schema" that also allows undefined paths without casting.
 *
 * Reason for using AnySchema instead of regular SchemaObject:
 * SchemaObject rejects undefined paths,
 * while AnySchema allows all paths including undefined ones (permissive mode)
 */
export function asAny(properties?: SchemaObject): AnySchema {
  if (properties === undefined) {
    return { [SCHEMA_TYPE]: 'any' } as AnySchema
  }
  return { [SCHEMA_TYPE]: 'any', properties } as AnySchema
}
