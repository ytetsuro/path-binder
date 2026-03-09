import { describe, it, expect } from 'vitest'
import { transform } from '../transform'
import type { FlatRow, PathSegment } from '../../types'
import { asNumber, asString } from '../../schema'
import { arrayOf } from '../../schema/arrayOf'

function flatRow(pairs: { path: string; value: unknown }[], sheet = 'sheet', index = 0): FlatRow {
  return { row: pairs, source: { sheet, index } }
}

describe('transform', () => {
  describe('without schema', () => {
    it('parses paths and yields ParsedRow', () => {
      const rows = [flatRow([{ path: 'user.name', value: 'Taro' }])]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result } = transform(rows, cache)

      expect(result).toStrictEqual([
        {
          pairs: [
            {
              segments: [
                { type: 'prop', name: 'user', isKey: false },
                { type: 'prop', name: 'name', isKey: false },
              ],
              value: 'Taro',
            },
          ],
          source: { sheet: 'sheet', index: 0 },
        },
      ])
    })

    it('stores parsePath results in cache', () => {
      const rows = [
        flatRow([{ path: 'user.name', value: 'Taro' }]),
        flatRow([{ path: 'user.name', value: 'Jiro' }], 'sheet', 1),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result } = transform(rows, cache)

      expect(cache.has('user.name')).toStrictEqual(true)
      // Same path string returns same reference (cache hit)
      expect(result[0].pairs[0].segments).toBe(result[1].pairs[0].segments)
    })

    it('processes rows with multiple pairs', () => {
      const rows = [
        flatRow([
          { path: 'user.$id', value: 1 },
          { path: 'user.name', value: 'Taro' },
        ]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result } = transform(rows, cache)

      expect(result[0].pairs.length).toStrictEqual(2)
      expect(result[0].pairs[0].segments[1].isKey).toStrictEqual(true)
    })
  })

  describe('with schema', () => {
    it('only passes paths matching the schema', () => {
      const rows = [
        flatRow([
          { path: 'user.name', value: 'Taro' },
          { path: 'user.age', value: 30 },
        ]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const schema = { user: { name: asString() } }
      const { rows: result } = transform(rows, cache, schema)

      // age is excluded because it is not defined in the schema
      expect(result[0].pairs.length).toStrictEqual(1)
      expect(result[0].pairs[0].value).toStrictEqual('Taro')
    })

    it('casts values with CastFn', () => {
      const rows = [
        flatRow([{ path: 'user.id', value: '42' }]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const schema = { user: { id: asNumber() } }
      const { rows: result } = transform(rows, cache, schema)

      expect(result[0].pairs[0].value).toStrictEqual(42)
    })

    it('skips rows where all pairs are excluded', () => {
      const rows = [
        flatRow([{ path: 'unknown.field', value: 'x' }]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const schema = { user: { name: asString() } }
      const { rows: result } = transform(rows, cache, schema)

      expect(result).toStrictEqual([])
    })

    it('filters and casts ArraySchema paths', () => {
      const rows = [
        flatRow([{ path: 'user.tags[]', value: 42 }]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const schema = { user: { tags: arrayOf(asString()) } }
      const { rows: result } = transform(rows, cache, schema)

      expect(result[0].pairs[0].value).toStrictEqual('42')
    })
  })

  describe('skip handling (cell mode, default)', () => {
    it('skips only invalid pairs and continues processing valid ones in same row', () => {
      const rows = [
        flatRow([
          { path: '', value: 'bad' },
          { path: 'user.name', value: 'Taro' },
        ]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result, skipped } = transform(rows, cache)

      expect(result.length).toStrictEqual(1)
      expect(result[0].pairs[0].value).toStrictEqual('Taro')
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0]).toStrictEqual({
        name: 'sheet',
        path: '',
        value: 'bad',
        index: 0,
        reason: 'empty',
      })
    })

    it('skips invalid rows and processes valid rows', () => {
      const rows = [
        flatRow([{ path: '', value: 'x' }]),
        flatRow([{ path: 'user.name', value: 'Taro' }], 'sheet', 1),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result, skipped } = transform(rows, cache)

      expect(result.length).toStrictEqual(1)
      expect(result[0].pairs[0].value).toStrictEqual('Taro')
      expect(skipped.length).toStrictEqual(1)
    })

    it('collects skip reason from SegmentError', () => {
      const rows = [
        flatRow([{ path: 'foo[bar', value: 'x' }]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { skipped } = transform(rows, cache)

      expect(skipped[0].reason).toStrictEqual('bracket')
    })

    it('skips pair with cast reason when CastFn throws', () => {
      function throwingCast() {
        throw new Error('cast failed')
      }
      const schema = { user: { name: throwingCast } }
      const rows = [
        flatRow([
          { path: 'user.name', value: 'Taro' },
          { path: 'user.age', value: 30 },
        ]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result, skipped } = transform(rows, cache, schema)

      // user.name is skipped due to CastFn failure; user.age is filtered by schema
      expect(result).toStrictEqual([])
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0]).toStrictEqual({
        name: 'sheet',
        path: 'user.name',
        value: 'Taro',
        index: 0,
        reason: 'cast',
      })
    })
  })

  describe('skip handling (row mode)', () => {
    it('skips entire row when any pair has invalid path', () => {
      const rows = [
        flatRow([
          { path: 'user.name', value: 'Taro' },
          { path: '', value: 'bad' },
        ]),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result, skipped } = transform(rows, cache, undefined, 'row')

      expect(result.length).toStrictEqual(0)
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0].reason).toStrictEqual('empty')
    })

    it('processes valid rows even when other rows are skipped', () => {
      const rows = [
        flatRow([{ path: '', value: 'bad' }]),
        flatRow([{ path: 'user.name', value: 'Taro' }], 'sheet', 1),
      ]
      const cache = new Map<string, readonly PathSegment[]>()
      const { rows: result, skipped } = transform(rows, cache, undefined, 'row')

      expect(result.length).toStrictEqual(1)
      expect(result[0].pairs[0].value).toStrictEqual('Taro')
      expect(skipped.length).toStrictEqual(1)
    })
  })
})
