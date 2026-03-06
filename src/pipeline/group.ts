import type { ParsedRow, ParsedPair } from '../types'

/**
 * Grouped row data
 */
export type Group = {
  readonly rows: readonly ParsedRow[]
}

/**
 * Scan all rows, extract grouping keys, and group rows with the same key (Stage 3: grouping).
 */
export function group(rows: readonly ParsedRow[]): Group[] {
  const groups = new Map<string, ParsedRow[]>()

  for (const row of rows) {
    const key = extractKey(row.pairs)
    const groupRows = groups.get(key) ?? []

    groupRows.push(row)

    groups.set(key, groupRows)
  }

  return Array.from(groups.values(), (groupRows) => ({ rows: groupRows }))
}

/**
 * Extract grouping key string from a row.
 *
 * Key determination rules:
 * - Rows with $key segments: identify group by $key path:value combinations
 * - Rows without $key: identify group by path:value of all prop segments excluding arrayProp/indexProp
 *
 * Reason for using concatenated path:value strings instead of JSON.stringify:
 * Keys are only used for Map lookups, so uniqueness is sufficient.
 * JSON.stringify has higher overhead
 */
function extractKey(pairs: readonly ParsedPair[]): string {
  const keyParts = pairs
    .filter((p) => hasKeySegment(p))
    .map((p) => formatKeyPair(p))

  if (keyParts.length > 0) {
    return keyParts.join('|')
  }

  // When no $key: identify by path:value of all prop segments excluding arrayProp/indexProp
  return pairs
    .filter((p) => isAllPropSegments(p))
    .map((p) => formatKeyPair(p))
    .join('|')
}

/**
 * Check whether a pair contains a $key (isKey=true) segment.
 */
function hasKeySegment(pair: ParsedPair): boolean {
  return pair.segments.some((s) => s.isKey)
}

/**
 * Check whether a pair contains no array-related segments (arrayProp/indexProp).
 * In auto-grouping (no $key), only non-array property values compose the key
 */
function isAllPropSegments(pair: ParsedPair): boolean {
  return pair.segments.every((s) => s.type === 'prop')
}

/**
 * Format a pair as a key string.
 * Joins segment names with dots and stringifies the value.
 *
 * TODO: When value is a long string (article body, Base64, etc.), the key string grows large
 * and Map key comparison cost increases. This is fine for short identifiers from spreadsheets,
 * but may be a concern for other input sources. Consider replacing with a fixed-length hash
 * (e.g., XXH128). However, hashing loses readability during debugging,
 * so the decision should balance performance and debuggability.
 */
function formatKeyPair(pair: ParsedPair): string {
  const path = pair.segments.map((s) => s.name).join('.')
  return `${path}:${String(pair.value)}`
}
