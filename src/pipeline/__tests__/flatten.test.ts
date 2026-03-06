import { describe, it, expect } from 'vitest'
import { flatten } from '../flatten'
import type { InputData } from '../../types'

describe('flatten', () => {
  it('yields a single sheet with a single row', () => {
    const input: InputData = {
      sheetA: [
        [{ path: 'user.name', value: 'Taro' }],
      ],
    }
    const result = [...flatten(input)]
    expect(result).toStrictEqual([
      {
        row: [{ path: 'user.name', value: 'Taro' }],
        source: { sheet: 'sheetA', index: 0 },
      },
    ])
  })

  it('yields multiple rows from a single sheet', () => {
    const input: InputData = {
      sheetA: [
        [{ path: 'user.name', value: 'Taro' }],
        [{ path: 'user.name', value: 'Jiro' }],
      ],
    }
    const result = [...flatten(input)]
    expect(result).toStrictEqual([
      {
        row: [{ path: 'user.name', value: 'Taro' }],
        source: { sheet: 'sheetA', index: 0 },
      },
      {
        row: [{ path: 'user.name', value: 'Jiro' }],
        source: { sheet: 'sheetA', index: 1 },
      },
    ])
  })

  it('yields rows from multiple sheets with source information', () => {
    const input: InputData = {
      sheetA: [
        [{ path: 'user.name', value: 'Taro' }],
      ],
      sheetB: [
        [{ path: 'user.name', value: 'Jiro' }],
      ],
    }
    const result = [...flatten(input)]
    expect(result).toStrictEqual([
      {
        row: [{ path: 'user.name', value: 'Taro' }],
        source: { sheet: 'sheetA', index: 0 },
      },
      {
        row: [{ path: 'user.name', value: 'Jiro' }],
        source: { sheet: 'sheetB', index: 0 },
      },
    ])
  })

  it('yields nothing from an empty sheet', () => {
    const input: InputData = { sheetA: [] }
    const result = [...flatten(input)]
    expect(result).toStrictEqual([])
  })

  it('yields nothing from empty input', () => {
    const input: InputData = {}
    const result = [...flatten(input)]
    expect(result).toStrictEqual([])
  })

  it('yields a row with multiple pairs as-is', () => {
    const input: InputData = {
      sheetA: [
        [
          { path: 'user.$id', value: 1 },
          { path: 'user.name', value: 'Taro' },
        ],
      ],
    }
    const result = [...flatten(input)]
    expect(result).toStrictEqual([
      {
        row: [
          { path: 'user.$id', value: 1 },
          { path: 'user.name', value: 'Taro' },
        ],
        source: { sheet: 'sheetA', index: 0 },
      },
    ])
  })
})
