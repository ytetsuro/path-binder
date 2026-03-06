import type { PathSegment } from '../types'
import type { SchemaNode, SchemaObject } from './types'
import { SCHEMA_TYPE } from './symbol'

/**
 * Takes a schema and returns a function that casts values using the CastFn for the path (partial application).
 *
 * Reason for not integrating with pathFilter:
 * pathFilter only returns a boolean check, valueCaster finds and applies CastFn for transformation.
 * Separated due to different responsibilities (check vs transform)
 */
export function valueCaster(schema: SchemaObject): (segments: readonly PathSegment[], value: unknown) => unknown {
  return (segments: readonly PathSegment[], value: unknown) => traverse(schema, segments, 0, value)
}

/**
 * Recursively traverse the schema tree along segments,
 * applying the CastFn to the value when found.
 *
 * Same traversal logic as pathFilter's traverse,
 * but differs in actually applying the reached CastFn.
 * Reason for not unifying: return types differ (boolean vs unknown),
 * and unifying would require excessive generification
 */
function traverse(node: SchemaNode, segments: readonly PathSegment[], index: number, value: unknown): unknown {
  if (typeof node === 'function') {
    // Reached CastFn: apply cast if this is the terminal segment
    if (index === segments.length) {
      return node(value)
    }
    return value
  }

  if (SCHEMA_TYPE in node) {
    if (node[SCHEMA_TYPE] === 'any') {
      // AnySchema: if property definitions exist, traverse them for casting; otherwise return as-is.
      // In pathFilter, AnySchema unconditionally returns true, but in valueCaster
      // traversal continues to apply CastFn within properties (asymmetric behavior)
      if (node.properties !== undefined && index < segments.length) {
        const seg = segments[index]
        const childNode: SchemaNode | undefined = node.properties[seg.name]
        if (childNode !== undefined) {
          return traverse(childNode, segments, index + 1, value)
        }
      }
      return value
    }

    // ArraySchema: traverse item
    if (node[SCHEMA_TYPE] === 'array') {
      return traverse(node.item, segments, index, value)
    }
  }

  // SchemaObject: traverse child node by segment name
  if (index >= segments.length) {
    return value
  }

  const seg = segments[index]
  const childNode: SchemaNode | undefined = (node as SchemaObject)[seg.name]
  if (childNode === undefined) {
    return value
  }

  // arrayProp/indexProp: one segment consumes both property access and array access
  if (seg.type === 'arrayProp' || seg.type === 'indexProp') {
    if (typeof childNode !== 'function' && SCHEMA_TYPE in childNode && childNode[SCHEMA_TYPE] === 'array') {
      return traverse(childNode.item, segments, index + 1, value)
    }
    return value
  }

  return traverse(childNode, segments, index + 1, value)
}
