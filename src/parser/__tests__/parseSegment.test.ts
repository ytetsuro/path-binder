import { describe, it, expect } from 'vitest'
import { parseSegment, SegmentError } from '../parseSegment'

describe('parseSegment', () => {
  it('parses a regular property name as prop', () => {
    expect(parseSegment('name')).toStrictEqual({
      type: 'prop',
      name: 'name',
      isKey: false,
    })
  })

  it('parses $ prefix as a grouping key', () => {
    expect(parseSegment('$id')).toStrictEqual({
      type: 'prop',
      name: 'id',
      isKey: true,
    })
  })

  it('parses $$ prefix as $ escape', () => {
    expect(parseSegment('$$ref')).toStrictEqual({
      type: 'prop',
      name: '$ref',
      isKey: false,
    })
  })

  it('parses [] suffix as arrayProp', () => {
    expect(parseSegment('items[]')).toStrictEqual({
      type: 'arrayProp',
      name: 'items',
      isKey: false,
    })
  })

  it('parses [n] suffix as indexProp', () => {
    expect(parseSegment('items[2]')).toStrictEqual({
      type: 'indexProp',
      name: 'items',
      isKey: false,
      index: 2,
    })
  })

  it('parses [0] index correctly', () => {
    expect(parseSegment('tags[0]')).toStrictEqual({
      type: 'indexProp',
      name: 'tags',
      isKey: false,
      index: 0,
    })
  })

  it('parses property names containing digits correctly', () => {
    expect(parseSegment('item1')).toStrictEqual({
      type: 'prop',
      name: 'item1',
      isKey: false,
    })
  })

  describe('validation', () => {
    it('throws SegmentError with reason "empty" on empty string', () => {
      expect(() => parseSegment('')).toThrow(SegmentError)
      try {
        parseSegment('')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('empty')
      }
    })

    it('throws SegmentError with reason "key" on $ alone', () => {
      expect(() => parseSegment('$')).toThrow(SegmentError)
      try {
        parseSegment('$')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('key')
      }
    })

    it('throws SegmentError with reason "escape" on $$ alone', () => {
      expect(() => parseSegment('$$')).toThrow(SegmentError)
      try {
        parseSegment('$$')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('escape')
      }
    })

    it('throws SegmentError with reason "unnamed" on index without name', () => {
      expect(() => parseSegment('[0]')).toThrow(SegmentError)
      try {
        parseSegment('[0]')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('unnamed')
      }
    })

    it('throws SegmentError with reason "bracket" on missing closing bracket', () => {
      expect(() => parseSegment('foo[bar')).toThrow(SegmentError)
      try {
        parseSegment('foo[bar')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('bracket')
      }
    })

    it('throws SegmentError with reason "index" on negative index', () => {
      expect(() => parseSegment('foo[-1]')).toThrow(SegmentError)
      try {
        parseSegment('foo[-1]')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('index')
      }
    })

    it('throws SegmentError with reason "index" on non-integer index', () => {
      expect(() => parseSegment('foo[1.5]')).toThrow(SegmentError)
      try {
        parseSegment('foo[1.5]')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('index')
      }
    })

    it('throws SegmentError with reason "index" on NaN string index', () => {
      expect(() => parseSegment('foo[abc]')).toThrow(SegmentError)
      try {
        parseSegment('foo[abc]')
      } catch (e) {
        expect((e as SegmentError).reason).toStrictEqual('index')
      }
    })
  })
})
