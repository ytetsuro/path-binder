import { describe, it, expect } from 'vitest'
import { generate } from '../generate'
import { defineSchema } from '../schema/defineSchema'
import { asNumber } from '../schema/asNumber'
import { asString } from '../schema/asString'
import { arrayOf } from '../schema/arrayOf'
import type { InputData } from '../types'

describe('generate', () => {
  describe('basic conversion', () => {
    it('generates object from single sheet with single row', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'name', value: 'Taro' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({ name: ['Taro'] })
    })

    it('generates nested properties', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.name', value: 'Taro' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({ user: [{ name: 'Taro' }] })
    })

    it('merges multiple rows in the same group', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [{ id: 1, name: 'Taro', info: [{ type: 'google' }] }],
      })
    })
  })

  describe('multiple groups', () => {
    it('generates multiple groups with different $key values', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Taro' }],
          [{ path: 'user.$id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro' },
          { id: 2, name: 'Jiro' },
        ],
      })
    })
  })

  describe('cross-sheet merge', () => {
    it('merges rows with same $key from different sheets', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Taro' }],
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

    it('different $key values from different sheets become separate groups', () => {
      const input: InputData = {
        sheetA: [
          [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Taro' }],
        ],
        sheetB: [
          [{ path: 'user.$id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [
          { id: 1, name: 'Taro' },
          { id: 2, name: 'Jiro' },
        ],
      })
    })
  })

  describe('with schema', () => {
    it('applies filter and cast with schema', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: '42' }, { path: 'user.name', value: 'Taro' }, { path: 'user.extra', value: 'ignored' }],
        ],
      }
      const schema = defineSchema({
        user: {
          id: asNumber(),
          name: asString(),
        },
      })
      const { result } = generate(input, { schema })
      expect(result).toStrictEqual({
        user: [{ id: 42, name: 'Taro' }],
      })
    })

    it('applies array cast with arrayOf in schema', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.id', value: 1 }, { path: 'user.tags[]', value: 'a' }],
          [{ path: 'user.id', value: 1 }, { path: 'user.tags[]', value: 'b' }],
        ],
      }
      const schema = defineSchema({
        user: {
          id: asNumber(),
          tags: arrayOf(asString()),
        },
      })
      const { result } = generate(input, { schema })
      expect(result).toStrictEqual({
        user: [{ id: 1, tags: ['a', 'b'] }],
      })
    })
  })

  describe('skip handling', () => {
    it('skips invalid pairs and returns skipped info (default cell mode)', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'name', value: 'Taro' }],
          [{ path: '', value: 'bad' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({ name: ['Taro'] })
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0]).toStrictEqual({
        name: 'sheet1',
        path: '',
        value: 'bad',
        index: 1,
        reason: 'empty',
      })
    })

    it('returns empty result with skipped info when all rows have invalid paths', () => {
      const input: InputData = {
        sheet1: [
          [{ path: '', value: 'bad1' }],
          [{ path: '', value: 'bad2' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({})
      expect(skipped.length).toStrictEqual(2)
    })

    it('returns skipped info with correct reason and source', () => {
      const input: InputData = {
        mySheet: [
          [{ path: 'valid', value: 'ok' }],
          [{ path: '', value: 'bad' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({ valid: ['ok'] })
      expect(skipped.length).toStrictEqual(1)
      expect(skipped[0].name).toStrictEqual('mySheet')
      expect(skipped[0].index).toStrictEqual(1)
      expect(skipped[0].reason).toStrictEqual('empty')
    })

    it('skips entire row in row mode when any pair is invalid', () => {
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

    it('keeps valid pairs in cell mode when some pairs are invalid', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.name', value: 'Taro' }, { path: '', value: 'bad' }],
        ],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({ user: [{ name: 'Taro' }] })
      expect(skipped.length).toStrictEqual(1)
    })
  })

  describe('edge cases', () => {
    it('returns empty result and empty skipped from empty input', () => {
      const { result, skipped } = generate({})
      expect(result).toStrictEqual({})
      expect(skipped).toStrictEqual([])
    })

    it('returns empty result from empty row array', () => {
      const input: InputData = {
        sheet1: [],
      }
      const { result, skipped } = generate(input)
      expect(result).toStrictEqual({})
      expect(skipped).toStrictEqual([])
    })

    it('aggregates records with multiple top-level keys', () => {
      const input: InputData = {
        sheet1: [
          [{ path: 'user.name', value: 'Taro' }, { path: 'config.theme', value: 'dark' }],
        ],
      }
      const { result } = generate(input)
      expect(result).toStrictEqual({
        user: [{ name: 'Taro' }],
        config: [{ theme: 'dark' }],
      })
    })

    it('scoped cache is isolated between generate() calls', () => {
      const input1: InputData = { sheet1: [[{ path: 'name', value: 'Taro' }]] }
      const input2: InputData = { sheet1: [[{ path: 'name', value: 'Jiro' }]] }
      const { result: r1 } = generate(input1)
      const { result: r2 } = generate(input2)
      expect(r1).toStrictEqual({ name: ['Taro'] })
      expect(r2).toStrictEqual({ name: ['Jiro'] })
    })
  })

  describe('auto-grouping without $key', () => {
    it('groups rows into same group when all prop values (excluding arrayProp) match', () => {
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
})
