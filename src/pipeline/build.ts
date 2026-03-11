import type { Group } from './group'
import type { BuiltEntity } from '../types'
import { writeToStore } from '../store/writeToStore'
import { toRecord } from '../store/toRecord'

/**
 * Write all rows of each group into a single store (Map)
 * and convert to Record (Stage 4: object construction).
 *
 * 1 group = 1 Record<string, unknown>
 */
export function build(groups: readonly Group[]): Record<string, unknown>[] {
  return groups.map((g) => {
    const store = new Map<string, unknown>()
    for (const row of g.rows) {
      const rowContext = new Map<string, Map<string, unknown>>()
      for (const pair of row.pairs) {
        writeToStore(store, pair.segments, pair.value, rowContext)
      }
    }
    return toRecord(store)
  })
}

/**
 * Build entities from groups, retaining the Map store for later mutation
 * by Pass 2 (reference resolution).
 *
 * Reason for not reusing build():
 * build() converts to Record immediately, but resolve needs mutable Map access
 * to write additional properties. Separate function avoids intermediate conversion.
 */
export function buildEntities(groups: readonly Group[]): BuiltEntity[] {
  return groups.map((g) => {
    const store = new Map<string, unknown>()
    for (const row of g.rows) {
      const rowContext = new Map<string, Map<string, unknown>>()
      for (const pair of row.pairs) {
        writeToStore(store, pair.segments, pair.value, rowContext)
      }
    }
    const rootPath = extractRootPath(g)
    const source = g.rows.map((row) => row.source)
    return { store, rootPath, source }
  })
}

/**
 * Extract the root path (first segment name) from a group's first pair.
 *
 * Reason for using the first pair's first segment:
 * All pairs in a group share the same root path by auto-grouping rules.
 * The first pair is always available (empty groups are not created).
 */
function extractRootPath(g: Group): string {
  return g.rows[0].pairs[0].segments[0].name
}
