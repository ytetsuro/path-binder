import { describe, it, expect } from 'vitest'
import { build, buildEntities } from '../build'
import type { Group } from '../group'
import type { ParsedPair, PathSegment } from '../../types'

function seg(type: PathSegment['type'], name: string, isKey = false, index?: number): PathSegment {
  if (index !== undefined) {
    return { type, name, isKey, index }
  }
  return { type, name, isKey }
}

function pair(segments: PathSegment[], value: unknown): ParsedPair {
  return { segments, value }
}

function makeGroup(pairsList: ParsedPair[][]): Group {
  return {
    rows: pairsList.map((pairs, i) => ({
      pairs,
      source: { sheet: 'sheet', index: i },
    })),
  }
}

describe('build', () => {
  it('generates Record from a single group with a single row', () => {
    const g = makeGroup([
      [pair([seg('prop', 'name')], 'Taro')],
    ])
    const result = [...build([g])]
    expect(result).toStrictEqual([{ name: 'Taro' }])
  })

  it('generates Record with nested properties', () => {
    const g = makeGroup([
      [pair([seg('prop', 'user'), seg('prop', 'name')], 'Taro')],
    ])
    const result = [...build([g])]
    expect(result).toStrictEqual([{ user: { name: 'Taro' } }])
  })

  it('merges multiple rows in the same group', () => {
    const g = makeGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('prop', 'name')], 'Taro')],
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'google')],
    ])
    const result = [...build([g])]
    expect(result).toStrictEqual([{
      user: { id: 1, name: 'Taro', info: [{ type: 'google' }] },
    }])
  })

  it('generates multiple Records from multiple groups', () => {
    const g1 = makeGroup([
      [pair([seg('prop', 'name')], 'Taro')],
    ])
    const g2 = makeGroup([
      [pair([seg('prop', 'name')], 'Jiro')],
    ])
    const result = [...build([g1, g2])]
    expect(result).toStrictEqual([{ name: 'Taro' }, { name: 'Jiro' }])
  })

  it('builds arrays with arrayProp', () => {
    const g = makeGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id')], 1),
       pair([seg('prop', 'user'), seg('arrayProp', 'tags')], 'a')],
      [pair([seg('prop', 'user'), seg('prop', 'id')], 1),
       pair([seg('prop', 'user'), seg('arrayProp', 'tags')], 'b')],
    ])
    const result = [...build([g])]
    expect(result).toStrictEqual([{ user: { id: 1, tags: ['a', 'b'] } }])
  })

  it('sets value at specified position with indexProp', () => {
    const g = makeGroup([
      [pair([seg('prop', 'items', false, undefined), seg('indexProp', 'list', false, 0)], 'first')],
    ])
    const result = [...build([g])]
    expect(result).toStrictEqual([{ items: { list: ['first'] } }])
  })

  it('yields nothing from empty group list', () => {
    const result = [...build([])]
    expect(result).toStrictEqual([])
  })
})

describe('buildEntities', () => {
  it('returns BuiltEntity with Map store and rootPath', () => {
    const g = makeGroup([
      [pair([seg('prop', 'user'), seg('prop', 'name')], 'Taro'),
       pair([seg('prop', 'user'), seg('prop', 'id')], 1)],
    ])
    const entities = buildEntities([g])
    expect(entities.length).toStrictEqual(1)
    expect(entities[0].rootPath).toStrictEqual('user')
    expect(entities[0].store.get('user')).toBeInstanceOf(Map)
    const userMap = entities[0].store.get('user') as Map<string, unknown>
    expect(userMap.get('name')).toStrictEqual('Taro')
    expect(userMap.get('id')).toStrictEqual(1)
  })

  it('preserves source info from all rows in group', () => {
    const g: Group = {
      rows: [
        { pairs: [pair([seg('prop', 'user'), seg('prop', 'id')], 1)], source: { sheet: 'sheetA', index: 0 } },
        { pairs: [pair([seg('prop', 'user'), seg('arrayProp', 'tags')], 'admin')], source: { sheet: 'sheetB', index: 2 } },
      ],
    }
    const entities = buildEntities([g])
    expect(entities[0].source).toStrictEqual([
      { sheet: 'sheetA', index: 0 },
      { sheet: 'sheetB', index: 2 },
    ])
  })

  it('builds multiple entities from multiple groups', () => {
    const g1 = makeGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id')], 1)],
    ])
    const g2 = makeGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id')], 2)],
    ])
    const entities = buildEntities([g1, g2])
    expect(entities.length).toStrictEqual(2)
  })

  it('returns empty array from empty group list', () => {
    const entities = buildEntities([])
    expect(entities).toStrictEqual([])
  })
})
