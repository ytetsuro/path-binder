import type { PathSegment, ParseSkipReason } from '../types'

/**
 * Internal error carrying a ParseSkipReason.
 *
 * Reason for not using a plain Error:
 * Callers need the structured reason code to build ParseSkipped records
 *
 * Reason for not exporting from public API:
 * This is an internal mechanism; consumers receive ParseSkipped instead
 */
export class SegmentError extends Error {
  readonly reason: ParseSkipReason
  constructor(message: string, reason: ParseSkipReason) {
    super(message)
    this.reason = reason
  }
}

/**
 * Parse a single segment string into a PathSegment.
 *
 * Reason for using manual prefix/suffix checks instead of regex:
 * The patterns are simple (only 3 types of prefix/suffix checks),
 * so regex compilation cost and capture group extraction are unnecessary
 */
export function parseSegment(raw: string): PathSegment {
  if (raw === '') {
    throw new SegmentError('Segment is empty', 'empty')
  }

  // $$ prefix: escape. Reason for using slice(1) instead of slice(2):
  // "$$ref" → removes one leading $ to make "$ref" the name (escape syntax for $-prefixed property names)
  if (raw.startsWith('$$')) {
    const name = raw.slice(1)
    if (name === '$') {
      throw new SegmentError(`Segment '${raw}' is invalid: name is required after $$`, 'escape')
    }
    return { type: 'prop', name, isKey: false }
  }

  // $ prefix: grouping key
  if (raw.startsWith('$')) {
    const name = raw.slice(1)
    if (name === '') {
      throw new SegmentError(`Segment '${raw}' is invalid: name is required after $`, 'key')
    }
    return { type: 'prop', name, isKey: true }
  }

  const bracketIndex = raw.indexOf('[')
  if (bracketIndex === -1) {
    return { type: 'prop', name: raw, isKey: false }
  }

  if (bracketIndex === 0) {
    throw new SegmentError(`Segment '${raw}' is invalid: name is required before []`, 'unnamed')
  }

  if (!raw.endsWith(']')) {
    throw new SegmentError(`Segment '${raw}' is invalid: missing closing bracket ]`, 'bracket')
  }

  const name = raw.slice(0, bracketIndex)
  const inside = raw.slice(bracketIndex + 1, -1)

  if (inside === '') {
    return { type: 'arrayProp', name, isKey: false }
  }

  // Reason for whitelist validation with regex:
  // Prevents silent conversions like Number(' ')=0, Number('')=0
  // Number/parseInt cannot detect these edge cases
  if (!/^\d+$/.test(inside)) {
    throw new SegmentError(`Segment '${raw}' is invalid: index must be a non-negative integer`, 'index')
  }
  const index = Number(inside)

  return { type: 'indexProp', name, isKey: false, index }
}
