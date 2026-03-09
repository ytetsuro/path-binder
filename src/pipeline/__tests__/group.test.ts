import { describe, it, expect } from 'vitest'
import { group } from '../group'
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

describe('group', () => {
  describe('grouping by $key', () => {
    it('groups rows with the same $key value and no non-array props into one group', () => {
      const rows = [
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'google')]),
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'facebook')], 'sheet', 1),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(1)
      expect(groups[0].rows.length).toStrictEqual(2)
    })

    it('groups $key rows with same $key value and same non-array prop into one group', () => {
      const rows = [
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'google')]),
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'facebook')], 'sheet', 1),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(1)
      expect(groups[0].rows.length).toStrictEqual(2)
    })

    it('separates $key rows with same $key value but different non-array prop into different groups', () => {
      const rows = [
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')]),
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('prop', 'role')], 'editor')], 'sheet', 1),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(2)
    })

    it('separates rows with different $key values into different groups', () => {
      const rows = [
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
             pair([seg('prop', 'user'), seg('prop', 'name')], 'Taro')]),
        row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 2),
             pair([seg('prop', 'user'), seg('prop', 'name')], 'Jiro')], 'sheet', 1),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(2)
      expect(groups[0].rows.length).toStrictEqual(1)
      expect(groups[1].rows.length).toStrictEqual(1)
    })
  })

  describe('auto-grouping (no $key)', () => {
    it('groups rows into same group when all prop values (excluding arrayProp) match', () => {
      const rows = [
        row([pair([seg('prop', 'user'), seg('prop', 'id')], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'facebook')]),
        row([pair([seg('prop', 'user'), seg('prop', 'id')], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'google')], 'sheet', 1),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(1)
      expect(groups[0].rows.length).toStrictEqual(2)
    })

    it('separates rows with different prop values into different groups', () => {
      const rows = [
        row([pair([seg('prop', 'user'), seg('prop', 'id')], 1),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'x')]),
        row([pair([seg('prop', 'user'), seg('prop', 'id')], 2),
             pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'y')], 'sheet', 1),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(2)
    })
  })

  describe('edge cases', () => {
    it('single row becomes one group', () => {
      const rows = [
        row([pair([seg('prop', 'name')], 'Taro')]),
      ]
      const groups = [...group(rows)]
      expect(groups.length).toStrictEqual(1)
      expect(groups[0].rows.length).toStrictEqual(1)
    })

    it('yields nothing from empty input', () => {
      const groups = [...group([])]
      expect(groups).toStrictEqual([])
    })
  })
})
