import type { ArraySchema, SchemaNode } from './types'
import { SCHEMA_TYPE } from './symbol'

/**
 * Generate an ArraySchema.
 * item specifies the schema node for array elements (CastFn / SchemaObject / ArraySchema / AnySchema).
 *
 * Reason for accepting SchemaNode instead of a generic type:
 * Array elements can be any schema node type, keeping type constraints loose
 */
export function arrayOf(item: SchemaNode): ArraySchema {
  return { [SCHEMA_TYPE]: 'array', item } as ArraySchema
}
