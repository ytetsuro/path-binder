import { describe, it, expect } from 'vitest'
import { toRecord } from '../toRecord'

describe('toRecord', () => {
  it('converts empty Map to empty object', () => {
    expect(toRecord(new Map())).toStrictEqual({})
  })

  it('converts flat Map to Record', () => {
    const store = new Map<string, unknown>([
      ['name', 'Taro'],
      ['age', 30],
    ])
    expect(toRecord(store)).toStrictEqual({ name: 'Taro', age: 30 })
  })

  it('recursively converts nested Map to Record', () => {
    const child = new Map<string, unknown>([['name', 'Taro']])
    const store = new Map<string, unknown>([['user', child]])
    expect(toRecord(store)).toStrictEqual({ user: { name: 'Taro' } })
  })

  it('recursively converts Map inside array to Record', () => {
    const item1 = new Map<string, unknown>([['type', 'google']])
    const item2 = new Map<string, unknown>([['type', 'twitter']])
    const store = new Map<string, unknown>([['info', [item1, item2]]])
    expect(toRecord(store)).toStrictEqual({
      info: [{ type: 'google' }, { type: 'twitter' }],
    })
  })

  it('preserves primitive values as-is', () => {
    const store = new Map<string, unknown>([
      ['str', 'hello'],
      ['num', 42],
      ['bool', true],
      ['nil', null],
    ])
    expect(toRecord(store)).toStrictEqual({
      str: 'hello',
      num: 42,
      bool: true,
      nil: null,
    })
  })

  it('preserves primitive values inside array as-is', () => {
    const store = new Map<string, unknown>([['tags', ['a', 'b', 'c']]])
    expect(toRecord(store)).toStrictEqual({ tags: ['a', 'b', 'c'] })
  })
})
