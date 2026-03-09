import { describe, it, expect } from 'vitest'
import { separate } from '../separate'
import type { ParsedRow, ParsedPair, PathSegment } from '../../types'

function seg(type: PathSegment['type'], name: string, isKey = false, index?: number): PathSegment {
  if (index !== undefined) {
    return { type, name, isKey, index }
  }
  return { type, name, isKey }
}

function pair(segments: PathSegment[], value: unknown): ParsedPair {
  return { segments, value }
}

function row(pairs: ParsedPair[], sheet = 'sheet', index = 0): ParsedRow {
  return { pairs, source: { sheet, index } }
}

describe('separate', () => {
  it('puts all rows into primary when no $key segments exist', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'name')], 'Taro')]),
      row([pair([seg('prop', 'user'), seg('prop', 'id')], 1)], 'sheet', 1),
    ]
    const result = separate(rows)
    expect(result.primary).toStrictEqual(rows)
    expect(result.reference).toStrictEqual([])
  })

  it('puts all rows into reference when all rows have $key segments', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
           pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')]),
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 2),
           pair([seg('prop', 'user'), seg('prop', 'role')], 'editor')], 'sheet', 1),
    ]
    const result = separate(rows)
    expect(result.primary).toStrictEqual([])
    expect(result.reference).toStrictEqual(rows)
  })

  it('separates mixed rows correctly', () => {
    const primaryRow = row([pair([seg('prop', 'user'), seg('prop', 'name')], 'Taro')])
    const refRow = row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
                        pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')], 'sheet', 1)
    const rows = [primaryRow, refRow]
    const result = separate(rows)
    expect(result.primary).toStrictEqual([primaryRow])
    expect(result.reference).toStrictEqual([refRow])
  })

  it('returns both empty arrays from empty input', () => {
    const result = separate([])
    expect(result.primary).toStrictEqual([])
    expect(result.reference).toStrictEqual([])
  })
})
