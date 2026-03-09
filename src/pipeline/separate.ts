import type { ParsedRow } from '../types'

/**
 * Result of separating rows into primary data and reference data.
 *
 * Reason for not using a tuple [primary, reference]:
 * Named fields prevent ordering mistakes at call sites
 */
export type SeparateResult = {
  readonly primary: readonly ParsedRow[]
  readonly reference: readonly ParsedRow[]
}

/**
 * Separate rows into primary data rows (no $key) and reference rows (has $key).
 *
 * Reason for not using reduce:
 * Two independent filter passes express intent more clearly than
 * a single reduce that builds two arrays simultaneously
 */
export function separate(rows: readonly ParsedRow[]): SeparateResult {
  return {
    primary: rows.filter((row) => !hasKeySegment(row)),
    reference: rows.filter((row) => hasKeySegment(row)),
  }
}

/**
 * Check whether any pair in the row contains a $key segment.
 */
function hasKeySegment(row: ParsedRow): boolean {
  return row.pairs.some((pair) =>
    pair.segments.some((seg) => seg.isKey),
  )
}
