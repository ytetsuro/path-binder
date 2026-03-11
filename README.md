# path-binder

A library that combines row data from multiple sheets using path syntax to generate nested JSON objects.

Transforms flat "row × column" data from spreadsheets or CSVs into nested objects following dot-notation paths. Supports cross-sheet data merging, array operations, and schema-based type casting.

**[Documentation](https://path-binder.botch.me)** — Full guide with interactive examples

## Installation

```bash
npm install path-binder
```

## Quick Start

```typescript
import { generate, defineSchema, asNumber, asString, arrayOf } from 'path-binder'

const input = {
  sheetA: [  // Primary data (no $)
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [  // Reference rows (with $)
    [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
  ],
}

const schema = defineSchema({
  user: {
    id: asNumber(),
    name: asString(),
    info: arrayOf({ type: asString() }),
  },
})

const { result } = generate(input, { schema })
// {
//   user: [
//     { id: 1, name: 'Taro', info: [{ type: 'google' }] },
//     { id: 2, name: 'Jiro' },
//   ]
// }
```

## Output Structure

`generate` **always returns top-level key values as arrays**. Each group becomes one element in the array.

```typescript
const { result } = generate({
  sheet1: [
    [{ path: 'user.name', value: 'Taro' }],
  ],
})
// { user: [{ name: 'Taro' }] }
//          ^^^^^^^^^^^^^^^^^  stored as an array element
```

## Path Syntax

Paths are dot-separated `.` strings that represent JSON structure.

> The following examples omit the top-level array wrapping `[...]`.
> Example: `{ user: { name: value } }` → actual output is `{ user: [{ name: value }] }`

### Properties

Dot-separated segments create nested objects.

```
path: 'user.name'        →  { user: { name: value } }
path: 'a.b.c.d'          →  { a: { b: { c: { d: value } } } }
```

### Array Append `[]`

Appending `[]` to a property name adds the value to an array. Setting multiple values to the same path accumulates them in the array.

```
path: 'user.tags[]'   (value: 'admin')     →  { user: { tags: ['admin'] } }
path: 'user.tags[]'   (value: 'editor')    →  { user: { tags: ['admin', 'editor'] } }
```

You can also place objects inside arrays.

```
path: 'user.info[].type'  (value: 'google')    →  { user: { info: [{ type: 'google' }] } }
path: 'user.info[].type'  (value: 'facebook')  →  { user: { info: [{ type: 'google' }, { type: 'facebook' }] } }
```

### Index Access `[n]`

`[n]` sets a value at a specific position in an array.

```
path: 'items.list[0]'  (value: 'first')   →  { items: { list: ['first'] } }
path: 'items.list[2]'  (value: 'third')   →  { items: { list: ['first', undefined, 'third'] } }
```

Can also be used as intermediate segments.

```
path: 'data.items[0].name'  (value: 'first')    →  { data: { items: [{ name: 'first' }] } }
path: 'data.items[1].name'  (value: 'second')   →  { data: { items: [{ name: 'first' }, { name: 'second' }] } }
```

### Reference Key `$`

Properties prefixed with `$` become **reference keys**. Rows containing reference keys are treated as **reference rows**, which search entities built from **primary data rows** (without `$`) by property value and attach data to matching entities.

Classification is **per-row**, not per-sheet. Primary data rows and reference rows can coexist within the same sheet.

#### Basic Reference

```typescript
const input = {
  sheetA: [  // Primary data (no $ → processed via auto-grouping)
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [  // Reference rows (with $ → search primary data and attach)
    [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, name: 'Taro', info: [{ type: 'google' }] },
//     { id: 2, name: 'Jiro' },
//   ]
// }
```

- `user.$id` means "search for entities whose `id` property under `user` matches the given value"
- The entity for Taro, whose `id` matches the value `1`, gets `info` attached
- The `$` prefix is removed from the key name in output (`$id` → used as a match condition)

#### Matching Multiple Entities

When multiple entities match the reference condition, data is attached to all of them.

```typescript
const input = {
  sheetA: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, name: 'Taro', info: [{ type: 'google' }] },
//     { id: 1, name: 'Jiro', info: [{ type: 'google' }] },
//   ]
// }
```

#### Mixing Within the Same Sheet

Primary data rows and reference rows can coexist in the same sheet.

```typescript
const input = {
  sheet1: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],   // primary row
    [{ path: 'user.$id', value: 1 }, { path: 'user.role', value: 'admin' }],  // reference row
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],    // primary row
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, name: 'Taro', role: 'admin' },
//     { id: 2, name: 'Jiro' },
//   ]
// }
```

#### Referencing Any Property

`$key` is not limited to `id` — you can search by any property.

```typescript
const input = {
  sheetA: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
  ],
  sheetB: [
    [{ path: 'user.$name', value: 'Taro' }, { path: 'user.info[].type', value: 'google' }],
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, name: 'Taro', info: [{ type: 'google' }] },
//   ]
// }
```

#### AND Search with Multiple $keys

Using multiple `$` keys attaches data only to entities that satisfy all conditions.

```typescript
const input = {
  sheetA: [
    [{ path: 'user.id', value: 1 }, { path: 'user.type', value: 'A' }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.type', value: 'A' }, { path: 'user.name', value: 'Jiro' }],
    [{ path: 'user.id', value: 3 }, { path: 'user.type', value: 'B' }, { path: 'user.name', value: 'Saburo' }],
  ],
  sheetB: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.$type', value: 'A' }, { path: 'user.flag', value: true }],
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, type: 'A', name: 'Taro', flag: true },   // $id=1 AND $type='A' → match
//     { id: 2, type: 'A', name: 'Jiro' },                // $id≠1 → no match
//     { id: 3, type: 'B', name: 'Saburo' },               // $type≠'A' → no match
//   ]
// }
```

#### Array Aggregation in Reference Rows

When multiple reference rows share the same $key condition, they are auto-grouped and attached together.

```typescript
const input = {
  sheetA: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
  ],
  sheetB: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
    [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'facebook' }],
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, name: 'Taro', info: [{ type: 'google' }, { type: 'facebook' }] },
//   ]
// }
```

#### Reference Key Constraints

| Constraint | Reason |
|------------|--------|
| `$key` can only be used on top-level prop segments | Reference matching on nested paths (e.g., `info[].$type`) would add excessive complexity |
| `$key` values must be primitive types (string, number, boolean) | Equality comparison for arrays/objects is not well-defined |
| `$key` and a non-`$key` property with the same name cannot coexist in the same row | Having both `user.$id` and `user.id` in the same row creates a contradiction |
| All `$key`s in a row must belong to the same root path | Mixing `user.$id` and `product.$code` makes the search scope ambiguous |

### Auto-Grouping

Rows without `$` keys are automatically grouped when their non-array property values match.

```typescript
const input = {
  sheet1: [
    [{ path: 'user.id', value: 1 }, { path: 'user.info[].type', value: 'facebook' }],
    [{ path: 'user.id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.info[].type', value: 'twitter' }],
  ],
}

const { result } = generate(input)
// {
//   user: [
//     { id: 1, info: [{ type: 'facebook' }, { type: 'google' }] },
//     { id: 2, info: [{ type: 'twitter' }] },
//   ]
// }
```

### Escape `$$`

To use a property name containing `$` in the output, escape it with `$$`.

```
path: 'data.$$ref'    →  { data: { $ref: value } }
```

### Path Syntax Summary

| Syntax | Meaning | Example | Result |
|--------|---------|---------|--------|
| `name` | Property | `user.name` | `{ user: { name: value } }` |
| `name[]` | Array append | `user.tags[]` | `{ user: { tags: [value] } }` |
| `name[n]` | Index access | `list[0]` | `{ list: [value] }` |
| `$name` | Reference key | `user.$id` | Searches primary data by `id` (used as match condition) |
| `$$name` | Escape | `data.$$ref` | `{ data: { $ref: value } }` |

## Schema

Define a schema with `defineSchema` to enable **path filtering** and **value type casting**.

### Cast Functions

| Function | Target Type | Example |
|----------|-------------|---------|
| `asString()` | `string` | `42` → `'42'` |
| `asNumber()` | `number` | `'42'` → `42` |
| `asBoolean()` | `boolean` | `1` → `true`, `0` → `false` |
| `asDate()` | `Date` | `'2024-01-01'` → `new Date('2024-01-01')` |
| `asCustom(fn)` | any | User-defined conversion function |

### Filtering

Paths not defined in the schema are excluded from the output.

```typescript
const input = {
  sheet1: [
    [{ path: 'user.id', value: '42' }, { path: 'user.name', value: 'Taro' }, { path: 'user.extra', value: 'ignored' }],
  ],
}

const schema = defineSchema({
  user: {
    id: asNumber(),
    name: asString(),
  },
})

const { result } = generate(input, { schema })
// { user: [{ id: 42, name: 'Taro' }] }
// extra is excluded
```

### Array Schema

Use `arrayOf` to define schemas for array elements.

```typescript
const schema = defineSchema({
  user: {
    tags: arrayOf(asString()),           // Primitive array
    info: arrayOf({ type: asString() }), // Object array
  },
})
```

### Loose Schema (asAny)

Use `asAny` to allow undefined paths while applying type casting to specific properties.

```typescript
const schema = defineSchema({
  user: asAny({ id: asNumber() }),
})

const { result } = generate(input, { schema })
// id is cast to number, other properties are output as-is
```

### Custom Casting

Use `asCustom` (alias: `as`) for custom conversion functions.

```typescript
import { asCustom } from 'path-binder'
// or
import { as } from 'path-binder'

const schema = defineSchema({
  user: {
    name: asCustom((v) => String(v).toUpperCase()),
  },
})
```

## Skip Handling

When input contains invalid paths or reference errors, those values are skipped and information is recorded in `skipped`.

```typescript
const input = {
  mySheet: [
    [{ path: 'name', value: 'ok' }],
    [{ path: '[invalid', value: 'bad' }],
  ],
}

const { result, skipped } = generate(input)
// result = { name: ['ok'] }
// skipped = [
//   { name: 'mySheet', path: '[invalid', value: 'bad', index: 1, reason: 'unnamed' },
// ]
```

Unresolved references are also reported as skipped.

```typescript
const input = {
  sheetA: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
  ],
  sheetB: [
    [{ path: 'user.$id', value: 999 }, { path: 'user.role', value: 'admin' }],
  ],
}

const { result, skipped } = generate(input)
// result = { user: [{ id: 1, name: 'Taro' }] }
// skipped = [
//   { ..., reason: 'reference_not_found' },
// ]
```

### Skip Reasons

#### Parse Errors

| reason | Meaning | Example |
|--------|---------|---------|
| `empty` | Path is an empty string | `''` |
| `key` | No name after `$` | `'user.$'` |
| `escape` | No name after `$$` | `'data.$$'` |
| `unnamed` | No name before `[]` | `'[0]'` |
| `bracket` | Missing closing bracket `]` | `'foo[bar'` |
| `index` | Index is not an integer | `'items[abc]'` |

#### Reference Errors

| reason | Meaning |
|--------|---------|
| `reference_not_found` | No entity found matching the $key reference |
| `no_primary_data` | All rows are $key rows with no primary data rows |
| `conflicting_key_prop` | A row contains both `$key` and a non-`$key` property with the same name |
| `nested_key` | `$key` appears inside an array path (e.g., `info[].$type`) |
| `invalid_key_value` | `$key` value is not a primitive |
| `mixed_key_root` | `$key`s in the same row belong to different root paths |
| `property_conflict` | Reference data conflicts with an existing primary data property (primary data takes precedence) |

### skipScope Option

By default, only cells with invalid paths are skipped (`cell` mode). In `row` mode, the entire row is skipped if any cell is invalid.

```typescript
const { result } = generate(input, { skipScope: 'row' })
```

## API Reference

### `generate(input, options?)`

Generates a JSON object from input data.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `InputData` | Object with sheet names as keys and row data arrays as values |
| `options.schema` | `SchemaObject` | Schema for filtering and type casting (optional) |
| `options.skipScope` | `'cell' \| 'row'` | Skip granularity. Default: `'cell'` |

**Returns:** `GenerateResult`

| Property | Type | Description |
|----------|------|-------------|
| `result` | `Record<string, unknown>` | Generated object (top-level values are always arrays) |
| `skipped` | `ParseSkipped[]` | Information about skipped entries |

### Input Data Format

```typescript
type InputData = {
  [sheetName: string]: PathValuePair[][]
}

type PathValuePair = {
  path: string
  value: unknown
}
```

Each sheet is an array of rows, and each row is an array of path-value pairs.

### Type Exports

```typescript
// Input/Output
import type { InputData, PathValuePair, GenerateOptions, GenerateResult } from 'path-binder'

// Schema
import type { SchemaObject, SchemaNode, CastFn } from 'path-binder'

// Skip information
import type { ParseSkipped, ParseSkipReason } from 'path-binder'
```

## License

MIT
