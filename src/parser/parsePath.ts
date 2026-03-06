import type { PathSegment } from '../types'
import { parseSegment } from './parseSegment'

/**
 * Split a path string by dots and parse each segment.
 *
 * Reason for not memoizing and computing every time as a pure function:
 * When caching is needed, the caller provides a scoped cache (created and destroyed per generate() call)
 */
export function parsePath(path: string): readonly PathSegment[] {
  return path.split('.').map((raw) => parseSegment(raw))
}
