import type { Group } from './group'
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
      for (const pair of row.pairs) {
        writeToStore(store, pair.segments, pair.value)
      }
    }
    return toRecord(store)
  })
}
