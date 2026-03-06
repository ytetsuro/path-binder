import { SCHEMA_TYPE } from './symbol'

/**
 * Value cast function
 * Takes unknown and returns a type-converted value
 */
export type CastFn<T = unknown> = (value: unknown) => T

/**
 * Array schema
 * Identified by SCHEMA_TYPE symbol (to fundamentally prevent collision with string properties)
 */
export type ArraySchema = {
  readonly [SCHEMA_TYPE]: 'array'
  readonly item: SchemaNode
}

/**
 * Any schema
 * Allows arbitrary structure with optional partial cast function definitions
 */
export type AnySchema = {
  readonly [SCHEMA_TYPE]: 'any'
  readonly properties?: SchemaObject
}

/**
 * Schema object (nested schema definition)
 */
export type SchemaObject = {
  readonly [key: string]: SchemaNode
}

/**
 * Schema node (union of all schema types)
 */
export type SchemaNode =
  | CastFn
  | SchemaObject
  | ArraySchema
  | AnySchema
