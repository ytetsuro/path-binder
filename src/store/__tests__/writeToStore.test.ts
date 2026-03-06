import { describe, it, expect } from 'vitest'
import { writeToStore } from '../writeToStore'
import { toRecord } from '../toRecord'
import type { PathSegment } from '../../types'

function prop(name: string, isKey = false): PathSegment {
  return { type: 'prop', name, isKey }
}

function arrayProp(name: string): PathSegment {
  return { type: 'arrayProp', name, isKey: false }
}

function indexProp(name: string, index: number): PathSegment {
  return { type: 'indexProp', name, isKey: false, index }
}

describe('writeToStore', () => {
  describe('prop segment', () => {
    it('sets value on terminal prop', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [prop('name')], 'Taro')
      expect(toRecord(store)).toStrictEqual({ name: 'Taro' })
    })

    it('creates child Map and descends on intermediate prop', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [prop('user'), prop('name')], 'Taro')
      expect(toRecord(store)).toStrictEqual({ user: { name: 'Taro' } })
    })

    it('sets value on deep nesting', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [prop('a'), prop('b'), prop('c')], 42)
      expect(toRecord(store)).toStrictEqual({ a: { b: { c: 42 } } })
    })

    it('appends to existing intermediate Map', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [prop('user'), prop('name')], 'Taro')
      writeToStore(store, [prop('user'), prop('age')], 30)
      expect(toRecord(store)).toStrictEqual({ user: { name: 'Taro', age: 30 } })
    })
  })

  describe('arrayProp segment', () => {
    it('appends value to terminal arrayProp', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [arrayProp('tags')], 'a')
      writeToStore(store, [arrayProp('tags')], 'b')
      expect(toRecord(store)).toStrictEqual({ tags: ['a', 'b'] })
    })

    it('appends new child Map at end and descends on intermediate arrayProp', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [arrayProp('info'), prop('type')], 'google')
      writeToStore(store, [arrayProp('info'), prop('type')], 'twitter')
      expect(toRecord(store)).toStrictEqual({
        info: [{ type: 'google' }, { type: 'twitter' }],
      })
    })
  })

  describe('indexProp segment', () => {
    it('sets value at specified position on terminal indexProp', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [indexProp('items', 0)], 'first')
      writeToStore(store, [indexProp('items', 2)], 'third')
      expect(toRecord(store)).toStrictEqual({ items: ['first', undefined, 'third'] })
    })

    it('gets or creates child Map at specified position on intermediate indexProp', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [indexProp('items', 0), prop('name')], 'a')
      writeToStore(store, [indexProp('items', 1), prop('name')], 'b')
      expect(toRecord(store)).toStrictEqual({
        items: [{ name: 'a' }, { name: 'b' }],
      })
    })
  })

  describe('mixed patterns', () => {
    it('writes value to composite path of prop + arrayProp + prop', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [prop('user'), arrayProp('info'), prop('type')], 'google')
      expect(toRecord(store)).toStrictEqual({
        user: { info: [{ type: 'google' }] },
      })
    })

    it('writes $key segment value as usual', () => {
      const store = new Map<string, unknown>()
      writeToStore(store, [prop('id', true)], 1)
      writeToStore(store, [prop('name')], 'Taro')
      expect(toRecord(store)).toStrictEqual({ id: 1, name: 'Taro' })
    })
  })
})
