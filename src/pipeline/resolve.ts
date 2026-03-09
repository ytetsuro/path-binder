import type { Group } from './group'
import type { BuiltEntity, ParsedPair, ParseSkipped } from '../types'
import { writeToStore } from '../store/writeToStore'

/**
 * Result of reference resolution.
 */
export type ResolveResult = {
  readonly skipped: readonly ParseSkipped[]
}

/**
 * Resolve reference groups against built entities.
 *
 * For each reference group:
 * 1. Extract $key conditions and non-$key data pairs
 * 2. Filter entities by root path scope
 * 3. Match entities by $key conditions (AND logic)
 * 4. Apply non-$key data to matched entities (with property conflict check)
 * 5. Report reference_not_found if no match
 *
 * Reason for mutating entity stores in place instead of creating copies:
 * Entities are created specifically for mutation by resolve.
 * Immutable copies would require expensive deep-clone of Map trees.
 */
export function resolve(
  refGroups: readonly Group[],
  entities: readonly BuiltEntity[],
): ResolveResult {
  const skipped: ParseSkipped[] = []

  for (const group of refGroups) {
    const allPairs = group.rows.flatMap((row) => row.pairs)
    const keyPairs = allPairs.filter((p) => hasKeySegment(p))
    const dataPairs = allPairs.filter((p) => !hasKeySegment(p))

    if (keyPairs.length === 0) {
      continue
    }

    const rootPath = keyPairs[0].segments[0].name
    const scopedEntities = entities.filter((e) => e.rootPath === rootPath)
    const matchedEntities = scopedEntities.filter((e) => matchesAllKeys(e, keyPairs))

    if (matchedEntities.length === 0) {
      skipped.push(toNotFoundSkipped(group, keyPairs))
      continue
    }

    const conflictSkipped = applyDataToEntities(matchedEntities, dataPairs, group)
    skipped.push(...conflictSkipped)
  }

  return { skipped }
}

/**
 * Check whether an entity matches all $key conditions (AND logic).
 *
 * Each $key pair specifies a condition: the entity must have
 * a property at the key segment's name with the matching value.
 */
function matchesAllKeys(entity: BuiltEntity, keyPairs: readonly ParsedPair[]): boolean {
  return keyPairs.every((keyPair) => {
    const keySeg = keyPair.segments.find((s) => s.isKey)
    if (keySeg === undefined) {
      return false
    }

    const rootMap = entity.store.get(entity.rootPath)
    if (!(rootMap instanceof Map)) {
      return false
    }

    return rootMap.get(keySeg.name) === keyPair.value
  })
}

/**
 * Apply non-$key data pairs to all matched entities.
 * Returns property_conflict skipped entries when a pair would overwrite existing data.
 *
 * Reason for checking existence before write instead of after:
 * Prevents mutation of primary data, ensuring "root wins" behavior
 */
function applyDataToEntities(
  entities: readonly BuiltEntity[],
  dataPairs: readonly ParsedPair[],
  group: Group,
): ParseSkipped[] {
  const skipped: ParseSkipped[] = []

  for (const pair of dataPairs) {
    for (const entity of entities) {
      if (hasConflict(entity, pair)) {
        skipped.push(toConflictSkipped(group, pair))
        continue
      }
      writeToStore(entity.store, pair.segments, pair.value)
    }
  }

  return skipped
}

/**
 * Check if writing this pair would conflict with existing primary data.
 *
 * Conflict detection: check if the target property already exists in the entity store.
 * Only checks non-array leaf properties (arrayProp/indexProp are always appendable).
 *
 * Reason for only checking non-array props:
 * Array data (arrayProp) is always appended, never overwrites.
 * Only scalar prop writes can conflict with existing values.
 */
function hasConflict(entity: BuiltEntity, pair: ParsedPair): boolean {
  const segments = pair.segments
  // Only check for conflict on scalar prop paths (no array segments)
  const hasArraySegment = segments.some((s) => s.type === 'arrayProp' || s.type === 'indexProp')
  if (hasArraySegment) {
    return false
  }

  let current: Map<string, unknown> = entity.store
  for (let i = 0; i < segments.length - 1; i++) {
    const child = current.get(segments[i].name)
    if (!(child instanceof Map)) {
      return false
    }
    current = child
  }

  const lastSeg = segments[segments.length - 1]
  return current.has(lastSeg.name)
}

function hasKeySegment(pair: ParsedPair): boolean {
  return pair.segments.some((s) => s.isKey)
}

function toNotFoundSkipped(group: Group, keyPairs: readonly ParsedPair[]): ParseSkipped {
  const firstKeyPair = keyPairs[0]
  const path = firstKeyPair.segments
    .map((s) => s.isKey ? `$${s.name}` : s.name)
    .join('.')
  return {
    name: group.rows[0].source.sheet,
    path,
    value: String(firstKeyPair.value),
    index: group.rows[0].source.index,
    reason: 'reference_not_found',
  }
}

function toConflictSkipped(group: Group, pair: ParsedPair): ParseSkipped {
  const path = pair.segments.map((s) => s.name).join('.')
  return {
    name: group.rows[0].source.sheet,
    path,
    value: String(pair.value),
    index: group.rows[0].source.index,
    reason: 'property_conflict',
  }
}
