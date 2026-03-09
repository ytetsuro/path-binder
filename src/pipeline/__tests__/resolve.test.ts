import { describe, it, expect } from 'vitest'
import { resolve } from '../resolve'
import type { Group } from '../group'
import type { BuiltEntity, ParsedPair, PathSegment, RowSource } from '../../types'
import { writeToStore } from '../../store/writeToStore'

function seg(type: PathSegment['type'], name: string, isKey = false, index?: number): PathSegment {
  if (index !== undefined) {
    return { type, name, isKey, index }
  }
  return { type, name, isKey }
}

function pair(segments: PathSegment[], value: unknown): ParsedPair {
  return { segments, value }
}

function makeRefGroup(pairsList: ParsedPair[][]): Group {
  return {
    rows: pairsList.map((pairs, i) => ({
      pairs,
      source: { sheet: 'sheet', index: i },
    })),
  }
}

function makeEntity(
  data: [PathSegment[], unknown][],
  rootPath: string,
  source: RowSource[] = [{ sheet: 'sheet', index: 0 }],
): BuiltEntity {
  const store = new Map<string, unknown>()
  for (const [segments, value] of data) {
    writeToStore(store, segments, value)
  }
  return { store, rootPath, source }
}

describe('resolve', () => {
  it('matches single $key and applies data to entity', () => {
    const entity = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Taro'],
    ], 'user')

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')],
    ])

    const { skipped } = resolve([refGroup], [entity])
    expect(skipped).toStrictEqual([])
    const userMap = entity.store.get('user') as Map<string, unknown>
    expect(userMap.get('role')).toStrictEqual('admin')
  })

  it('matches multiple $key with AND logic', () => {
    const entity1 = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
      [[seg('prop', 'user'), seg('prop', 'type')], 'A'],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Taro'],
    ], 'user')
    const entity2 = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 2],
      [[seg('prop', 'user'), seg('prop', 'type')], 'A'],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Jiro'],
    ], 'user', [{ sheet: 'sheet', index: 1 }])

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('prop', 'type', true)], 'A'),
       pair([seg('prop', 'user'), seg('prop', 'flag')], true)],
    ])

    const { skipped } = resolve([refGroup], [entity1, entity2])
    expect(skipped).toStrictEqual([])
    // Only entity1 should have flag
    const user1 = entity1.store.get('user') as Map<string, unknown>
    expect(user1.get('flag')).toStrictEqual(true)
    const user2 = entity2.store.get('user') as Map<string, unknown>
    expect(user2.has('flag')).toStrictEqual(false)
  })

  it('applies data to all matching entities', () => {
    const entity1 = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Taro'],
    ], 'user')
    const entity2 = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Jiro'],
    ], 'user', [{ sheet: 'sheet', index: 1 }])

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'google')],
    ])

    const { skipped } = resolve([refGroup], [entity1, entity2])
    expect(skipped).toStrictEqual([])
    const user1 = entity1.store.get('user') as Map<string, unknown>
    expect(user1.get('info')).toStrictEqual([expect.objectContaining({})])
    const user2 = entity2.store.get('user') as Map<string, unknown>
    expect(user2.get('info')).toStrictEqual([expect.objectContaining({})])
  })

  it('reports reference_not_found when no entity matches', () => {
    const entity = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
    ], 'user')

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 999),
       pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')],
    ])

    const { skipped } = resolve([refGroup], [entity])
    expect(skipped.length).toStrictEqual(1)
    expect(skipped[0].reason).toStrictEqual('reference_not_found')
  })

  it('applies array data to entity', () => {
    const entity = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Taro'],
    ], 'user')

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'google')],
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('arrayProp', 'info'), seg('prop', 'type')], 'facebook')],
    ])

    const { skipped } = resolve([refGroup], [entity])
    expect(skipped).toStrictEqual([])
    const userMap = entity.store.get('user') as Map<string, unknown>
    const info = userMap.get('info') as unknown[]
    expect(info.length).toStrictEqual(2)
  })

  it('scopes search by root path: does not match entities with different rootPath', () => {
    const userEntity = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
    ], 'user')
    const productEntity = makeEntity([
      [[seg('prop', 'product'), seg('prop', 'id')], 1],
    ], 'product', [{ sheet: 'sheet', index: 1 }])

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('prop', 'role')], 'admin')],
    ])

    const { skipped } = resolve([refGroup], [userEntity, productEntity])
    expect(skipped).toStrictEqual([])
    const userMap = userEntity.store.get('user') as Map<string, unknown>
    expect(userMap.get('role')).toStrictEqual('admin')
    // product should not be affected
    const productMap = productEntity.store.get('product') as Map<string, unknown>
    expect(productMap.has('role')).toStrictEqual(false)
  })

  it('reports property_conflict when reference data conflicts with primary data', () => {
    const entity = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
      [[seg('prop', 'user'), seg('prop', 'name')], 'Taro'],
    ], 'user')

    const refGroup = makeRefGroup([
      [pair([seg('prop', 'user'), seg('prop', 'id', true)], 1),
       pair([seg('prop', 'user'), seg('prop', 'name')], 'Override')],
    ])

    const { skipped } = resolve([refGroup], [entity])
    expect(skipped.length).toStrictEqual(1)
    expect(skipped[0].reason).toStrictEqual('property_conflict')
    // Primary data should be preserved
    const userMap = entity.store.get('user') as Map<string, unknown>
    expect(userMap.get('name')).toStrictEqual('Taro')
  })

  it('returns empty skipped from empty ref groups', () => {
    const entity = makeEntity([
      [[seg('prop', 'user'), seg('prop', 'id')], 1],
    ], 'user')

    const { skipped } = resolve([], [entity])
    expect(skipped).toStrictEqual([])
  })
})
