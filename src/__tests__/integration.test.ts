import { describe, it, expect } from 'vitest'
import { generate } from '../generate'
import { defineSchema } from '../schema/defineSchema'
import { asNumber } from '../schema/asNumber'
import { asString } from '../schema/asString'
import { asBoolean } from '../schema/asBoolean'
import { asAny } from '../schema/asAny'
import { arrayOf } from '../schema/arrayOf'
import type { InputData } from '../types'

describe('integration tests', () => {
  describe('basic usage examples', () => {
    it('reproduces the design document usage example (primary + reference)', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const schema = defineSchema({
        user: {
          id: asNumber(),
          name: asString(),
          info: arrayOf({ type: asString() }),
        },
      })
      const { result } = generate(input, { schema })
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', info: [{ type: 'google' }] },
          { id: 2, name: 'Jiro' },
        ],
      })
    })
  })

  describe('cross-sheet merge', () => {
    it('merges reference rows with same $key from different sheets', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [{ id: 1, name: 'Taro', info: [{ type: 'google' }] }],
      })
    })

    it('merges reference rows with same $key across 3 sheets', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
        ],
        sheetC: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'facebook' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [{ id: 1, name: 'Taro', info: [{ type: 'google' }, { type: 'facebook' }] }],
      })
    })
  })

  describe('$key reference', () => {
    it('applies reference data to matching entities across sheets', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', info: [{ type: 'google' }] },
          { id: 2, name: 'Jiro' },
        ],
      })
    })

    it('groups primary data by auto-grouping (composite key without $)', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'record.type', value: 'A' }, { path: 'record.code', value: 1 }, { path: 'record.data[]', value: 'x' }],
          [{ path: 'record.type', value: 'A' }, { path: 'record.code', value: 1 }, { path: 'record.data[]', value: 'y' }],
          [{ path: 'record.type', value: 'A' }, { path: 'record.code', value: 2 }, { path: 'record.data[]', value: 'z' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        record: [
          { type: 'A', code: 1, data: ['x', 'y'] },
          { type: 'A', code: 2, data: ['z'] },
        ],
      })
    })
  })

  describe('auto-grouping without $key', () => {
    it('groups by non-array property values when no $key is present', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: 1 }, { path: 'user.info[].type', value: 'facebook' }],
          [{ path: 'user.id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.info[].type', value: 'twitter' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, info: [{ type: 'facebook' }, { type: 'google' }] },
          { id: 2, info: [{ type: 'twitter' }] },
        ],
      })
    })
  })

  describe('path syntax combinations', () => {
    it('combines nesting + array append + properties in array', () => {
      const input: InputData = {
        sheet1: [
          [
            { path: 'user.name', value: 'Taro' },
            { path: 'user.tags[]', value: 'admin' },
            { path: 'user.info[].type', value: 'google' },
          ],
          [
            { path: 'user.name', value: 'Taro' },
            { path: 'user.tags[]', value: 'editor' },
            { path: 'user.info[].type', value: 'facebook' },
          ],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [{
          name: 'Taro',
          tags: ['admin', 'editor'],
          info: [{ type: 'google' }, { type: 'facebook' }],
        }],
      })
    })

    it('builds sparse array with index access', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'items.list[0]', value: 'first' }, { path: 'items.list[2]', value: 'third' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        items: [{ list: ['first', undefined, 'third'] }],
      })
    })

    it('combines primary data with nesting + array via $key reference', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: 1 }],
        ],
        sheet2: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.profile.tags[]', value: 'admin' }],
          [{ path: 'user.$id', value: 1 }, { path: 'user.profile.tags[]', value: 'editor' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [{ id: 1, profile: { tags: ['admin', 'editor'] } }],
      })
    })

    it('uses indexProp as an intermediate segment', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'data.items[0].name', value: 'first' }, { path: 'data.items[1].name', value: 'second' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        data: [{ items: [{ name: 'first' }, { name: 'second' }] }],
      })
    })

    it('preserves $ prefix with $$ escape', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'data.$$ref', value: '#/defs/User' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        data: [{ $ref: '#/defs/User' }],
      })
    })
  })

  describe('schema + cross-sheet', () => {
    it('filters with schema while merging cross-sheet via $key', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: '1' }, { path: 'user.name', value: 'Taro' }, { path: 'user.debug', value: 'x' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: '1' }, { path: 'user.info[].type', value: 'google' }, { path: 'user.temp', value: 'y' }],
        ],
      }
      const schema = defineSchema({
        user: {
          id: asNumber(),
          name: asString(),
          info: arrayOf({ type: asString() }),
        },
      })
      const { result } = generate(input, { schema })
      expect(result).toStrictEqual({
        user: [{ id: 1, name: 'Taro', info: [{ type: 'google' }] }],
      })
    })

    it('allows undefined paths with asAny schema', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: '42' }, { path: 'user.name', value: 'Taro' }, { path: 'user.extra', value: 'kept' }],
        ],
      }
      const schema = defineSchema({
        user: asAny({ id: asNumber() }),
      })
      const { result } = generate(input, { schema })
      expect(result).toStrictEqual({
        user: [{ id: 42, name: 'Taro', extra: 'kept' }],
      })
    })

    it('casts with asBoolean', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'config.enabled', value: 1 }, { path: 'config.verbose', value: 0 }],
        ],
      }
      const schema = defineSchema({
        config: {
          enabled: asBoolean(),
          verbose: asBoolean(),
        },
      })
      const { result } = generate(input, { schema })
      expect(result).toStrictEqual({
        config: [{ enabled: true, verbose: false }],
      })
    })
  })

  describe('skip handling integration', () => {
    it('returns skipped info with source information', () => {
      const input: InputData = {
        mySheet: [
          [{ path: 'name', value: 'ok' }],
          [{ path: '[invalid', value: 'bad' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({ name: ['ok'] })
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0].name).toStrictEqual('mySheet')
      expect(skipped[0].index).toStrictEqual(1)
      expect(skipped[0].reason).toStrictEqual('unnamed')
    })

    it('skips rows with invalid paths and processes valid rows (default cell mode)', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'name', value: 'Taro' }],
          [{ path: '', value: 'bad' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({ name: ['Taro'] })
      expect(skipped.length).toStrictEqual(1)
    })

    it('processes only valid rows from a sheet containing invalid rows', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: '', value: 'bad' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro' },
          { id: 2, name: 'Jiro' },
        ],
      })
      expect(skipped.length).toStrictEqual(1)
    })

    it('skips entire row in row mode', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.name', value: 'Taro' }, { path: '', value: 'bad' }],
          [{ path: 'user.name', value: 'Jiro' }],
        ],
      }
      const { result, skipped } = generate(input, { skipScope: 'row' })
      expect(result).toStrictEqual({ user: [{ name: 'Jiro' }] })
      expect(skipped.length).toStrictEqual(1)
    })
  })

  describe('edge cases', () => {
    it('processes normally even when empty sheets are mixed in', () => {
      const input: InputData = {
        empty1: [],
        data: [
          [{ path: 'name', value: 'Taro' }],
        ],
        empty2: [],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({ name: ['Taro'] })
    })

    it('returns empty object when all sheets are empty', () => {
      const input: InputData = {
        sheet1: [],
        sheet2: [],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({})
    })

    it('builds deeply nested objects', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'a.b.c.d.e', value: 'deep' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        a: [{ b: { c: { d: { e: 'deep' } } } }],
      })
    })

    it('aggregates records with multiple top-level keys in a single row', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'users.name', value: 'Taro' }, { path: 'settings.theme', value: 'dark' }],
          [{ path: 'users.name', value: 'Jiro' }, { path: 'settings.lang', value: 'ja' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        users: [
          { name: 'Taro' },
          { name: 'Jiro' },
        ],
        settings: [
          { theme: 'dark' },
          { lang: 'ja' },
        ],
      })
    })
  })

  describe('$key reference key (FINAL_DESIGN examples)', () => {
    it('example 1: basic reference (applies to multiple matching entities)', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Jiro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', info: [{ type: 'google' }] },
          { id: 1, name: 'Jiro', info: [{ type: 'google' }] },
        ],
      })
    })

    it('example 2: mixed primary and reference rows in same sheet', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Jiro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Saburo' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', info: [{ type: 'google' }] },
          { id: 1, name: 'Jiro', info: [{ type: 'google' }] },
          { id: 2, name: 'Saburo' },
        ],
      })
    })

    it('example 3: reference any property', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.role', value: 'admin' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', role: 'admin' },
        ],
      })
    })

    it('example 4: array aggregation (primary) + reference', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }, { path: 'user.tags[]', value: 'admin' }],
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }, { path: 'user.tags[]', value: 'editor' }],
        ],
        sheetB: [
          [{ path: 'user.$name', value: 'Taro' }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', tags: ['admin', 'editor'], info: [{ type: 'google' }] },
        ],
      })
    })

    it('example 5: reference not found (error reporting)', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 999 }, { path: 'user.role', value: 'admin' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro' },
        ],
      })
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0].reason).toStrictEqual('reference_not_found')
    })

    it('example 6: multiple $key AND search', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.type', value: 'A' }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.type', value: 'A' }, { path: 'user.name', value: 'Jiro' }],
          [{ path: 'user.id', value: 3 }, { path: 'user.type', value: 'B' }, { path: 'user.name', value: 'Saburo' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.$type', value: 'A' }, { path: 'user.flag', value: true }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, type: 'A', name: 'Taro', flag: true },
          { id: 2, type: 'A', name: 'Jiro' },
          { id: 3, type: 'B', name: 'Saburo' },
        ],
      })
    })

    it('example 7: $key row array aggregation', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'facebook' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', info: [{ type: 'google' }, { type: 'facebook' }] },
        ],
      })
    })

    it('single-sheet mixing: primary and reference rows in same sheet', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.$id', value: 1 }, { path: 'user.role', value: 'admin' }],
          [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', role: 'admin' },
          { id: 2, name: 'Jiro' },
        ],
      })
    })

    it('$name reference: searches by arbitrary property name', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$name', value: 'Taro' }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro', info: [{ type: 'google' }] },
        ],
      })
    })

    it('all rows are $key (no_primary_data)', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.role', value: 'admin' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({})
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0].reason).toStrictEqual('no_primary_data')
    })

    it('property_conflict: primary data wins + skip reported', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Override' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro' },
        ],
      })
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0].reason).toStrictEqual('property_conflict')
    })
  })
})
