import { describe, it, expect } from 'vitest'
import { validateReferenceRows } from '../validate'
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

describe('validateReferenceRows', () => {
  it('passes valid reference row through', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
           pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual(rows)
    expect(result.skipped).toStrictEqual([])
  })

  it('skips nested_key: $key after arrayProp segment', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type', true)], 'google'),
           pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped.length).toStrictEqual(1)
    expect(result.skipped[0].reason).toStrictEqual('nested_key')
  })

  it('skips nested_key: $key after indexProp segment', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('indexProp', 'items', false, 0), seg('prop', 'type', true)], 'x')]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('nested_key')
  })

  it('skips invalid_key_value: $key value is object', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], { nested: true })]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('invalid_key_value')
  })

  it('skips invalid_key_value: $key value is array', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], [1, 2])]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('invalid_key_value')
  })

  it('skips invalid_key_value: $key value is null', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], null)]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('invalid_key_value')
  })

  it('skips invalid_key_value: $key value is undefined', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], undefined)]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('invalid_key_value')
  })

  it('skips conflicting_key_prop: same row has user.$id and user.id', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
           pair([seg('prop', 'user'), seg('prop', 'id')], 99)]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('conflicting_key_prop')
  })

  it('skips mixed_key_root: $key segments from different root paths', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
           pair([seg('prop', 'product'), seg('prop', 'code', true)], 'A')]),
    ]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([])
    expect(result.skipped[0].reason).toStrictEqual('mixed_key_root')
  })

  it('returns skipped with correct source info', () => {
    const rows = [
      row([pair([seg('prop', 'user'), seg('prop', 'id', true)], null)], 'mySheet', 5),
    ]
    const result = validateReferenceRows(rows)
    expect(result.skipped[0].name).toStrictEqual('mySheet')
    expect(result.skipped[0].index).toStrictEqual(5)
  })

  it('validates multiple rows independently', () => {
    const validRow = row([pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
                          pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')])
    const invalidRow = row([pair([seg('prop', 'user'), seg('prop', 'id', true)], null)], 'sheet', 1)
    const rows = [validRow, invalidRow]
    const result = validateReferenceRows(rows)
    expect(result.valid).toStrictEqual([validRow])
    expect(result.skipped.length).toStrictEqual(1)
  })

  it('returns both empty from empty input', () => {
    const result = validateReferenceRows([])
    expect(result.valid).toStrictEqual([])
    expect(result.skipped).toStrictEqual([])
  })
})
