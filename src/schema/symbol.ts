/**
 * Internal symbol for schema type discrimination
 *
 * Reason for using symbol instead of string property:
 * To avoid collision with SchemaObject's index signature
 */
export const SCHEMA_TYPE: unique symbol = Symbol('SchemaType')
