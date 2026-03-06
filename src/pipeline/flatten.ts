import type { InputData, FlatRow } from '../types'

/**
 * Flatten rows from multiple sheets with source information (Stage 1: flattening).
 */
export function flatten(input: InputData): FlatRow[] {
  const result: FlatRow[] = []

  for (const [sheet, rows] of Object.entries(input)) {
    for (let index = 0; index < rows.length; index++) {
      // Reason for using push instead of concat: concat creates a new array each time,
      // while push only appends to the local array, which is more memory-efficient
      result.push({ row: rows[index], source: { sheet, index } })
    }
  }

  return result
}
