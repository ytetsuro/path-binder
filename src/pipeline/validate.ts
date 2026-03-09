import type { ParsedRow, ParsedPair, ParseSkipped, ParseSkipReason } from '../types'

/**
 * Result of validating reference rows.
 */
export type ValidateResult = {
  readonly valid: readonly ParsedRow[]
  readonly skipped: readonly ParseSkipped[]
}

/**
 * Validate reference rows and separate into valid and skipped.
 *
 * Validation rules (checked in priority order):
 * 1. nested_key: $key must not appear after arrayProp/indexProp segments
 * 2. invalid_key_value: $key value must be primitive (string, number, boolean)
 * 3. conflicting_key_prop: same row must not have $key and non-$key with same name
 * 4. mixed_key_root: all $key segments in a row must share the same root path
 *
 * Reason for not using a single-pass reduce:
 * Separate validation check + partition makes each validation rule independently testable
 */
export function validateReferenceRows(rows: readonly ParsedRow[]): ValidateResult {
  const valid: ParsedRow[] = []
  const skipped: ParseSkipped[] = []

  for (const row of rows) {
    const reason = detectInvalidReason(row)
    if (reason !== undefined) {
      skipped.push(toSkipped(row, reason))
      continue
    }
    valid.push(row)
  }

  return { valid, skipped }
}

/**
 * Detect the first validation failure reason for a reference row.
 * Returns undefined if the row is valid.
 *
 * Reason for returning on first failure instead of collecting all:
 * A single skip reason per row is sufficient for error reporting,
 * and early return avoids unnecessary checks
 */
function detectInvalidReason(row: ParsedRow): ParseSkipReason | undefined {
  const keyPairs = row.pairs.filter((p) => hasKeySegment(p))

  const nestedReason = checkNestedKey(keyPairs)
  if (nestedReason !== undefined) {
    return nestedReason
  }

  const valueReason = checkInvalidKeyValue(keyPairs)
  if (valueReason !== undefined) {
    return valueReason
  }

  const conflictReason = checkConflictingKeyProp(row.pairs, keyPairs)
  if (conflictReason !== undefined) {
    return conflictReason
  }

  return checkMixedKeyRoot(keyPairs)
}

/**
 * Check if any $key segment appears after an arrayProp or indexProp segment.
 */
function checkNestedKey(keyPairs: readonly ParsedPair[]): ParseSkipReason | undefined {
  for (const pair of keyPairs) {
    let foundArray = false
    for (const seg of pair.segments) {
      if (seg.type === 'arrayProp' || seg.type === 'indexProp') {
        foundArray = true
        continue
      }
      if (foundArray && seg.isKey) {
        return 'nested_key'
      }
    }
  }
  return undefined
}

/**
 * Check if any $key has a non-primitive value.
 *
 * Reason for explicit type checks instead of typeof guard:
 * null has typeof 'object', so explicit null check is necessary
 */
function checkInvalidKeyValue(keyPairs: readonly ParsedPair[]): ParseSkipReason | undefined {
  for (const pair of keyPairs) {
    if (!isPrimitive(pair.value)) {
      return 'invalid_key_value'
    }
  }
  return undefined
}

/**
 * Check if the row has both $key and non-$key pairs with the same property name.
 */
function checkConflictingKeyProp(
  allPairs: readonly ParsedPair[],
  keyPairs: readonly ParsedPair[],
): ParseSkipReason | undefined {
  const keyNames = new Set(
    keyPairs.map((p) => extractKeyName(p)),
  )

  const nonKeyPairs = allPairs.filter((p) => !hasKeySegment(p))
  for (const pair of nonKeyPairs) {
    const lastName = pair.segments[pair.segments.length - 1]?.name
    if (keyNames.has(lastName)) {
      return 'conflicting_key_prop'
    }
  }
  return undefined
}

/**
 * Check if $key segments in the row belong to different root paths.
 */
function checkMixedKeyRoot(keyPairs: readonly ParsedPair[]): ParseSkipReason | undefined {
  if (keyPairs.length <= 1) {
    return undefined
  }

  const roots = new Set(
    keyPairs.map((p) => p.segments[0].name),
  )
  if (roots.size > 1) {
    return 'mixed_key_root'
  }
  return undefined
}

function hasKeySegment(pair: ParsedPair): boolean {
  return pair.segments.some((s) => s.isKey)
}

/**
 * Extract the property name from a $key pair.
 * The key segment is the one with isKey=true.
 */
function extractKeyName(pair: ParsedPair): string {
  const keySeg = pair.segments.find((s) => s.isKey)
  return keySeg!.name
}

function isPrimitive(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }
  const t = typeof value
  return t === 'string' || t === 'number' || t === 'boolean'
}

/**
 * Build a ParseSkipped from a row and reason.
 * Uses the first $key pair's path for reporting.
 */
function toSkipped(row: ParsedRow, reason: ParseSkipReason): ParseSkipped {
  const keyPair = row.pairs.find((p) => hasKeySegment(p))
  const path = keyPair
    ? keyPair.segments.map((s) => s.isKey ? `$${s.name}` : s.name).join('.')
    : ''
  const value = keyPair ? String(keyPair.value) : ''
  return {
    name: row.source.sheet,
    path,
    value,
    index: row.source.index,
    reason,
  }
}
