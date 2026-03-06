import type { FlatRow, ParsedRow, ParsedPair, PathSegment, ParseSkipped, ParseSkipReason } from '../types'
import type { SchemaObject } from '../schema/types'
import { parsePath } from '../parser/parsePath'
import { pathFilter } from '../schema/pathFilter'
import { valueCaster } from '../schema/valueCaster'
import { SegmentError } from '../parser/parseSegment'

/**
 * Result of the transform stage.
 *
 * Reason for not returning just ParsedRow[]:
 * Callers need both the successfully parsed rows and skip information
 */
export type TransformResult = {
  readonly rows: ParsedRow[]
  readonly skipped: ParseSkipped[]
}

/**
 * Takes flatten output and applies parse → filter → cast to each row's pairs (Stage 2: transformation).
 *
 * Reason for integrating three operations into one function:
 * Separating parseRow → filter → cast would generate three intermediate arrays.
 * Processing one pair at a time eliminates intermediate arrays (Generator pipeline optimization)
 */
export function transform(
  rows: readonly FlatRow[],
  cache: Map<string, readonly PathSegment[]>,
  schema?: SchemaObject,
  skipScope: 'row' | 'cell' = 'cell',
): TransformResult {
  // Pre-generate partially applied functions when schema is provided.
  // Reason for not generating inside the loop: partial application only needs to happen once; recomputing is wasteful
  const isAllowed = schema !== undefined ? pathFilter(schema) : undefined
  const castValue = schema !== undefined ? valueCaster(schema) : undefined
  const resultRows: ParsedRow[] = []
  const skipped: ParseSkipped[] = []

  for (const flatRow of rows) {
    const processed = processPairs(flatRow, cache, isAllowed, castValue, skipScope, skipped)
    if (processed.length === 0) {
      continue
    }
    // Reason for using push: only appends to local array, more memory-efficient
    resultRows.push({ pairs: processed, source: flatRow.source })
  }

  return { rows: resultRows, skipped }
}

/**
 * Process all pairs for a single row.
 * On parse error, collect skip info and continue (cell) or skip entire row (row).
 *
 * Reason for collecting into an array before returning:
 * The "skip row if all pairs are excluded" check requires the result after processing all pairs
 */
function processPairs(
  flatRow: FlatRow,
  cache: Map<string, readonly PathSegment[]>,
  isAllowed: ((segments: readonly PathSegment[]) => boolean) | undefined,
  castValue: ((segments: readonly PathSegment[], value: unknown) => unknown) | undefined,
  skipScope: 'row' | 'cell',
  skipped: ParseSkipped[],
): readonly ParsedPair[] {
  const pairs: ParsedPair[] = []

  // Reason for pre-collecting row-scope skips into a temporary array:
  // In 'row' mode, we only commit skips after confirming the entire row is discarded
  const rowSkips: ParseSkipped[] = []

  for (const pair of flatRow.row) {
    let segments: readonly PathSegment[]
    try {
      segments = cachedParsePath(pair.path, cache)
    } catch (e) {
      const reason: ParseSkipReason = e instanceof SegmentError ? e.reason : 'empty'
      const skip: ParseSkipped = {
        name: flatRow.source.sheet,
        path: pair.path,
        value: String(pair.value),
        index: flatRow.source.index,
        reason,
      }

      if (skipScope === 'row') {
        // Reason for using push: appending to local mutable array within function scope
        rowSkips.push(skip)
        // Commit all accumulated row skips and discard the entire row
        for (const s of rowSkips) {
          skipped.push(s)
        }
        return []
      }

      // cell mode: skip only this pair, continue processing others
      // Reason for using push: appending to output parameter array within controlled scope
      skipped.push(skip)
      continue
    }

    if (isAllowed !== undefined && !isAllowed(segments)) {
      continue
    }

    const value = castValue !== undefined
      ? castValue(segments, pair.value)
      : pair.value

    // Reason for using push instead of concat:
    // Need to check for empty array after processing all pairs, so append to mutable local array each time
    pairs.push({ segments, value })
  }

  return pairs
}

/**
 * Retrieve parsePath result from scoped cache.
 * If not cached, compute and store in cache.
 *
 * Reason for using scoped cache instead of module-level cache:
 * Created and destroyed per generate() call to prevent unbounded cache growth
 */
function cachedParsePath(
  path: string,
  cache: Map<string, readonly PathSegment[]>,
): readonly PathSegment[] {
  const cached = cache.get(path)
  if (cached !== undefined) {
    return cached
  }
  const segments = parsePath(path)
  cache.set(path, segments)
  return segments
}
