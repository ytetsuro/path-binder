/**
 * Path segment types
 * - prop: regular property (e.g., name)
 * - arrayProp: array append (e.g., items[])
 * - indexProp: array index access (e.g., items[2])
 *
 * Reason for not using enum or string literal instead of union:
 * With only 3 variants, an explicit union is appropriate for exhaustive type checking
 */
export type SegmentType = 'prop' | 'arrayProp' | 'indexProp'

/**
 * Parsed path segment
 *
 * index exists only for indexProp.
 * Reason for not using union type instead of optional:
 * Ensures accessing index on non-indexProp segments returns undefined at the type level
 */
export type PathSegment = {
  readonly type: SegmentType
  readonly name: string
  readonly isKey: boolean
  readonly index?: number
}

/**
 * Path-value pair (minimum unit of input data)
 */
export type PathValuePair = {
  readonly path: string
  readonly value: unknown
}

/**
 * Input data format
 * Sheet name as key, array of rows (arrays of PathValuePair) as value
 */
export type InputData = {
  readonly [sheetName: string]: readonly (readonly PathValuePair[])[]
}

/**
 * Source information (for error reporting)
 * Tag to identify which sheet and row number
 */
export type RowSource = {
  readonly sheet: string
  readonly index: number
}

/**
 * Row data after flatten (with source information)
 */
export type FlatRow = {
  readonly row: readonly PathValuePair[]
  readonly source: RowSource
}

/**
 * Parsed pair (minimum unit after transform)
 */
export type ParsedPair = {
  readonly segments: readonly PathSegment[]
  readonly value: unknown
}

/**
 * Parsed row (row data after transform)
 */
export type ParsedRow = {
  readonly pairs: readonly ParsedPair[]
  readonly source: RowSource
}

/**
 * Reason for skipping a path parse.
 *
 * Reason for not using a generic string type:
 * Exhaustive union ensures all skip reasons are documented and handled
 */
export type ParseSkipReason =
  | 'empty'                // segment is empty string
  | 'escape'               // $$ missing name
  | 'key'                  // $ missing name
  | 'unnamed'              // [] without preceding name
  | 'bracket'              // missing closing ]
  | 'index'                // non-numeric index
  | 'reference_not_found'  // $key reference target not found
  | 'no_primary_data'      // all rows are $key rows (no primary data)
  | 'conflicting_key_prop' // same row has $key and non-$key with same name
  | 'nested_key'           // $key inside array path (e.g. info[].$type)
  | 'invalid_key_value'    // $key value is not primitive
  | 'mixed_key_root'       // $key segments in same row belong to different root paths
  | 'property_conflict'    // reference data conflicts with primary data property
  | 'cast'                 // CastFn threw during value casting

/**
 * Information about a skipped path-value pair.
 *
 * Reason for not using Error subclass:
 * Skip is not an exceptional condition; it is expected data to be returned to callers
 */
export type ParseSkipped = {
  readonly name: string             // sheetName
  readonly path: string             // invalid path string
  readonly value: string            // String(pair.value)
  readonly index: number            // row index
  readonly reason: ParseSkipReason  // skip reason
}

/**
 * Result of the generate function.
 *
 * Reason for wrapping in an object instead of returning just Record:
 * Allows returning both the partial result and skip information simultaneously
 */
export type GenerateResult = {
  readonly result: Record<string, unknown>
  readonly skipped: readonly ParseSkipped[]
}

/**
 * Entity built from Pass 1 (primary data).
 * Retains the Map store for later mutation by Pass 2 (reference resolution).
 *
 * Reason for not converting to Record immediately:
 * resolve needs to write additional properties via writeToStore,
 * which requires mutable Map access. Conversion to Record is deferred to collect.
 */
export type BuiltEntity = {
  readonly store: Map<string, unknown>
  readonly rootPath: string
  readonly source: readonly RowSource[]
}

/**
 * Options for the generate function
 */
export type GenerateOptions = {
  readonly schema?: import('./schema/types').SchemaObject
  readonly skipScope?: 'row' | 'cell'  // default: 'cell'
}
