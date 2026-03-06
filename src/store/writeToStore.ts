import type { PathSegment } from '../types'

/**
 * Write a value to a Map along a sequence of segments.
 *
 * Reason for using a loop instead of recursion:
 * Segments are a linear list and each step only updates the "current Map",
 * so a loop is clearer in intent and does not consume the call stack
 *
 * Reason for using Map instead of plain objects:
 * Eliminates prototype pollution from dynamic property assignment (obj[key] = value)
 */
export function writeToStore(
  store: Map<string, unknown>,
  segments: readonly PathSegment[],
  value: unknown,
): void {
  let current = store
  const lastIndex = segments.length - 1

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const isLast = i === lastIndex

    if (seg.type === 'prop') {
      if (isLast) {
        current.set(seg.name, value)
        return
      }
      current = getOrCreateChildMap(current, seg.name)
      continue
    }

    if (seg.type === 'arrayProp') {
      const arr = getOrCreateArray(current, seg.name)
      if (isLast) {
        arr.push(value)
        return
      }
      const child = new Map<string, unknown>()
      arr.push(child)
      current = child
      continue
    }

    // indexProp
    const arr = getOrCreateArray(current, seg.name)
    // Fill with undefined up to the specified position to avoid sparse arrays.
    // arr[index] = value would create empty slots, causing toStrictEqual mismatches
    fillToIndex(arr, seg.index!)
    if (isLast) {
      arr[seg.index!] = value
      return
    }
    current = getOrCreateChildMapAtIndex(arr, seg.index!)
  }
}

/**
 * Get a child Map from a Map. If absent, create a new Map and set it.
 */
function getOrCreateChildMap(parent: Map<string, unknown>, name: string): Map<string, unknown> {
  const existing = parent.get(name)
  if (existing instanceof Map) {
    return existing
  }
  const child = new Map<string, unknown>()
  parent.set(name, child)
  return child
}

/**
 * Get an array from a Map. If absent, create a new array and set it.
 */
function getOrCreateArray(parent: Map<string, unknown>, name: string): unknown[] {
  const existing = parent.get(name)
  if (Array.isArray(existing)) {
    return existing
  }
  const arr: unknown[] = []
  parent.set(name, arr)
  return arr
}

/**
 * Fill an array with undefined up to the specified index.
 * Reason for avoiding sparse arrays:
 * Empty slots and undefined behave differently in JSON.stringify and toStrictEqual
 */
function fillToIndex(arr: unknown[], index: number): void {
  while (arr.length <= index) {
    arr.push(undefined)
  }
}

/**
 * Get a child Map at the specified index of an array. If absent, create a new Map and set it.
 */
function getOrCreateChildMapAtIndex(arr: unknown[], index: number): Map<string, unknown> {
  const existing = arr[index]
  if (existing instanceof Map) {
    return existing
  }
  const child = new Map<string, unknown>()
  arr[index] = child
  return child
}
