import { describe, it, expect } from 'vitest'
import { parsePath } from '../parsePath'

describe('parsePath', () => {
  it('parses a single segment path', () => {
    expect(parsePath('name')).toStrictEqual([
      { type: 'prop', name: 'name', isKey: false },
    ])
  })

  it('parses a dot-separated nested path', () => {
    expect(parsePath('user.name')).toStrictEqual([
      { type: 'prop', name: 'user', isKey: false },
      { type: 'prop', name: 'name', isKey: false },
    ])
  })

  it('parses a path containing $key', () => {
    expect(parsePath('user.$id')).toStrictEqual([
      { type: 'prop', name: 'user', isKey: false },
      { type: 'prop', name: 'id', isKey: true },
    ])
  })

  it('parses a path containing array property', () => {
    expect(parsePath('user.info[].type')).toStrictEqual([
      { type: 'prop', name: 'user', isKey: false },
      { type: 'arrayProp', name: 'info', isKey: false },
      { type: 'prop', name: 'type', isKey: false },
    ])
  })

  it('parses a path containing index access', () => {
    expect(parsePath('user.tags[0]')).toStrictEqual([
      { type: 'prop', name: 'user', isKey: false },
      { type: 'indexProp', name: 'tags', isKey: false, index: 0 },
    ])
  })

  it('parses a path containing $$ escape', () => {
    expect(parsePath('user.$$ref')).toStrictEqual([
      { type: 'prop', name: 'user', isKey: false },
      { type: 'prop', name: '$ref', isKey: false },
    ])
  })

  it('parses a deeply nested path', () => {
    expect(parsePath('a.b.c.d')).toStrictEqual([
      { type: 'prop', name: 'a', isKey: false },
      { type: 'prop', name: 'b', isKey: false },
      { type: 'prop', name: 'c', isKey: false },
      { type: 'prop', name: 'd', isKey: false },
    ])
  })

  describe('validation', () => {
    it('throws on empty string', () => {
      expect(() => parsePath('')).toThrow()
    })

    it('throws on leading dot (empty segment)', () => {
      expect(() => parsePath('.name')).toThrow()
    })

    it('throws on trailing dot (empty segment)', () => {
      expect(() => parsePath('name.')).toThrow()
    })

    it('throws on consecutive dots (empty segment)', () => {
      expect(() => parsePath('a..b')).toThrow()
    })

    it('throws on dot only', () => {
      expect(() => parsePath('.')).toThrow()
    })
  })
})
