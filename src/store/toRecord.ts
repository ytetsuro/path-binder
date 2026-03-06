/**
 * Recursively convert a Map to a Record.
 *
 * Reason for using Object.fromEntries instead of Object.assign:
 * Eliminates prototype pollution risk from dynamic property assignment (obj[key] = value)
 */
export function toRecord(store: Map<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Array.from(store, ([key, value]) => [key, convertValue(value)]),
  )
}

/**
 * Recursively convert based on value type.
 */
function convertValue(value: unknown): unknown {
  if (value instanceof Map) {
    return toRecord(value as Map<string, unknown>)
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertValue(item))
  }

  return value
}
