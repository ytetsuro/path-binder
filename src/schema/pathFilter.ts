import type { PathSegment } from '../types'
import type { SchemaNode, SchemaObject } from './types'
import { SCHEMA_TYPE } from './symbol'

/**
 * Takes a schema and returns a function that checks whether a path is allowed (partial application).
 *
 * Reason for not integrating pathFilter and valueCaster:
 * pathFilter returns a boolean check, valueCaster transforms values — different responsibilities.
 * Integration would run unnecessary transformation code when only checking is needed
 */
export function pathFilter(schema: SchemaObject): (segments: readonly PathSegment[]) => boolean {
  return (segments: readonly PathSegment[]) => traverse(schema, segments, 0)
}

/**
 * Recursively traverse the schema tree along segments.
 *
 * Reason for using recursion instead of a loop:
 * To handle ArraySchema / AnySchema nesting,
 * recursion naturally expresses the different child node retrieval methods per type
 */
function traverse(node: SchemaNode, segments: readonly PathSegment[], index: number): boolean {
  if (typeof node === 'function') {
    // Reached CastFn: allow if this is the terminal segment
    return index === segments.length
  }

  if (SCHEMA_TYPE in node) {
    if (node[SCHEMA_TYPE] === 'any') {
      // AnySchema: all remaining segments are allowed
      return true
    }

    // ArraySchema: not normally called directly, but handled for safety
    // (usually accessed via arrayProp/indexProp as a child of SchemaObject)
    if (node[SCHEMA_TYPE] === 'array') {
      return traverse(node.item, segments, index)
    }
  }

  // SchemaObject: traverse child node by segment name
  if (index >= segments.length) {
    return false
  }

  const seg = segments[index]
  // $key segments search the schema by name (name without $)
  const childNode: SchemaNode | undefined = (node as SchemaObject)[seg.name]
  if (childNode === undefined) {
    return false
  }

  // For arrayProp/indexProp segments:
  // Since the segment encodes both property access and array access,
  // if the child is ArraySchema, dive directly into item (one segment consumes two levels)
  if (seg.type === 'arrayProp' || seg.type === 'indexProp') {
    if (typeof childNode !== 'function' && SCHEMA_TYPE in childNode && childNode[SCHEMA_TYPE] === 'array') {
      return traverse(childNode.item, segments, index + 1)
    }
    // Mismatch: array path received but schema is not ArraySchema
    return false
  }

  return traverse(childNode, segments, index + 1)
}
