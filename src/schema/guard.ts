import type { SchemaNode, ArraySchema, AnySchema, CastFn, SchemaObject } from './types'
import { SCHEMA_TYPE } from './symbol'

/**
 * Check whether a SchemaNode is an ArraySchema.
 *
 * Reason for using `in` operator instead of isSchemaObject type guard:
 * ArraySchema's string key properties structurally satisfy SchemaObject's index signature,
 * so a type guard function cannot exclude ArraySchema.
 * The `in` operator applies TypeScript's built-in narrowing for accurate type narrowing
 * (details: .claude/rules/typescript-narrowing.md)
 */
export function isArraySchema(node: SchemaNode): node is ArraySchema {
  if (typeof node === 'function') {
    return false
  }
  return SCHEMA_TYPE in node && node[SCHEMA_TYPE] === 'array'
}

/**
 * Check whether a SchemaNode is an AnySchema.
 */
export function isAnySchema(node: SchemaNode): node is AnySchema {
  if (typeof node === 'function') {
    return false
  }
  return SCHEMA_TYPE in node && node[SCHEMA_TYPE] === 'any'
}

/**
 * Check whether a SchemaNode is a CastFn.
 *
 * Reason for using typeof === 'function':
 * CastFn is a function type, while SchemaObject / ArraySchema / AnySchema are object types.
 * Simply checking whether it's a function with typeof reliably distinguishes them
 */
export function isCastFn(node: SchemaNode): node is CastFn {
  return typeof node === 'function'
}

/**
 * Check whether a SchemaNode is a SchemaObject.
 *
 * Reason for checking absence of SCHEMA_TYPE:
 * SchemaObject uses an index signature type, so positive property checks cannot
 * distinguish it from ArraySchema or AnySchema.
 * An object that is "neither a function nor has SCHEMA_TYPE" is confirmed as SchemaObject
 */
export function isSchemaObject(node: SchemaNode): node is SchemaObject {
  if (typeof node === 'function') {
    return false
  }
  return !(SCHEMA_TYPE in node)
}
