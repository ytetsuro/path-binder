# path-binder

A library that joins row data from multiple sheets using path syntax to build nested JSON objects.

It turns flat data from spreadsheets or CSVs -- rows and columns -- into nested objects by following dot-based paths. It supports merging data across sheets, array operations, and type casting with schemas.

## Install

```bash
npm install path-binder
```

## Quick Start

```typescript
import { generate, defineSchema, asNumber, asString, arrayOf } from 'path-binder'

const input = {
  sheetA: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Taro' }],
  ],
  sheetB: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.info[].type', value: 'google' }],
    [{ path: 'user.$id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
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

## Output Shape

`generate` **always returns top-level values as arrays**. Each group becomes one item in the array.

```typescript
const { result } = generate({
  sheet1: [
    [{ path: 'user.name', value: 'Taro' }],
  ],
})
// { user: [{ name: 'Taro' }] }
//          ^^^^^^^^^^^^^^^^^  stored as an array item
```

## Path Syntax

A path is a dot-separated `.` string that describes the JSON structure.

> The examples below omit the top-level array wrap `[...]` for simplicity.
> Example: `{ user: { name: value } }` → actual output is `{ user: [{ name: value }] }`

### Properties

Dots create nested objects.

```
path: 'user.name'        →  { user: { name: value } }
path: 'a.b.c.d'          →  { a: { b: { c: { d: value } } } }
```

### Array Append `[]`

Add `[]` to a property name to push values into an array. When multiple values use the same path, they are appended to the array.

```
path: 'user.tags[]'   (value: 'admin')     →  { user: { tags: ['admin'] } }
path: 'user.tags[]'   (value: 'editor')    →  { user: { tags: ['admin', 'editor'] } }
```

You can also put objects inside arrays.

```
path: 'user.info[].type'  (value: 'google')    →  { user: { info: [{ type: 'google' }] } }
path: 'user.info[].type'  (value: 'facebook')  →  { user: { info: [{ type: 'google' }, { type: 'facebook' }] } }
```

### Index Access `[n]`

Use `[n]` to set a value at a specific position in an array.

```
path: 'items.list[0]'  (value: 'first')   →  { items: { list: ['first'] } }
path: 'items.list[2]'  (value: 'third')   →  { items: { list: ['first', undefined, 'third'] } }
```

You can also use it as a middle segment.

```
path: 'data.items[0].name'  (value: 'first')    →  { data: { items: [{ name: 'first' }] } }
path: 'data.items[1].name'  (value: 'second')   →  { data: { items: [{ name: 'first' }, { name: 'second' }] } }
```

### Group Key `$`

A property with the `$` prefix becomes a **group key**. Rows with the same key value are merged into one object, which becomes one item in the output array. This lets you combine data spread across multiple rows or multiple sheets.

```typescript
const input = {
  sheetA: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.$id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [
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

- Rows with the same `$id` value `1` are merged into one object, even across sheets
- The `$` prefix is removed from the output (`$id` → `id`)

#### Composite Keys

You can use multiple `$` keys to group by combined conditions.

```typescript
const input = {
  sheet1: [
    [{ path: 'record.$type', value: 'A' }, { path: 'record.$code', value: 1 }, { path: 'record.data[]', value: 'x' }],
    [{ path: 'record.$type', value: 'A' }, { path: 'record.$code', value: 1 }, { path: 'record.data[]', value: 'y' }],
    [{ path: 'record.$type', value: 'A' }, { path: 'record.$code', value: 2 }, { path: 'record.data[]', value: 'z' }],
  ],
}

const { result } = generate(input)
// {
//   record: [
//     { type: 'A', code: 1, data: ['x', 'y'] },
//     { type: 'A', code: 2, data: ['z'] },
//   ]
// }
```

#### Auto Grouping

Even without `$` keys, rows are grouped automatically when their non-array property values match.

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

Use `$$` to include a `$` in the output property name.

```
path: 'data.$$ref'    →  { data: { $ref: value } }
```

### Path Syntax Summary

| Syntax | Meaning | Example | Result |
|------|------|------|------|
| `name` | Property | `user.name` | `{ user: { name: value } }` |
| `name[]` | Array append | `user.tags[]` | `{ user: { tags: [value] } }` |
| `name[n]` | Index access | `list[0]` | `{ list: [value] }` |
| `$name` | Group key | `user.$id` | Groups rows (output is `id`) |
| `$$name` | Escape | `data.$$ref` | `{ data: { $ref: value } }` |

## Schema

Use `defineSchema` to set up **path filtering** and **value type casting**.

### Cast Functions

| Function | Target type | Example |
|------|--------|------|
| `asString()` | `string` | `42` → `'42'` |
| `asNumber()` | `number` | `'42'` → `42` |
| `asBoolean()` | `boolean` | `1` → `true`, `0` → `false` |
| `asDate()` | `Date` | `'2024-01-01'` → `new Date('2024-01-01')` |
| `asCustom(fn)` | Any | Cast with your own function |

### Filtering

Paths not in the schema are removed from the output.

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
// extra is removed
```

### Array Schema

Use `arrayOf` to set the schema for array items.

```typescript
const schema = defineSchema({
  user: {
    tags: arrayOf(asString()),           // primitive array
    info: arrayOf({ type: asString() }), // object array
  },
})
```

### Loose Schema (asAny)

Use `asAny` to allow all paths while casting only some properties.

```typescript
const schema = defineSchema({
  user: asAny({ id: asNumber() }),
})

const { result } = generate(input, { schema })
// id is cast to number, other properties are kept as-is
```

### Custom Cast

Use `asCustom` (alias: `as`) to apply your own cast function.

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

When input has bad paths, those values are skipped and recorded in `skipped`.

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

### Skip Reasons

| reason | Meaning | Example |
|--------|------|------|
| `empty` | Path is empty | `''` |
| `key` | No name after `$` | `'user.$'` |
| `escape` | No name after `$$` | `'data.$$'` |
| `unnamed` | No name before `[]` | `'[0]'` |
| `bracket` | Missing closing `]` | `'foo[bar'` |
| `index` | Non-numeric index | `'items[abc]'` |

### skipScope Option

By default, only the bad cell is skipped (`cell` mode). In `row` mode, the whole row is skipped if any cell has a bad path.

```typescript
const { result } = generate(input, { skipScope: 'row' })
```

## API Reference

### `generate(input, options?)`

Builds JSON objects from input data.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `input` | `InputData` | Object with sheet names as keys and row data arrays as values |
| `options.schema` | `SchemaObject` | Schema for filtering and type casting (optional) |
| `options.skipScope` | `'cell' \| 'row'` | Skip level. Default: `'cell'` |

**Returns:** `GenerateResult`

| Property | Type | Description |
|---|---|---|
| `result` | `Record<string, unknown>` | The built object (top-level values are always arrays) |
| `skipped` | `ParseSkipped[]` | Info about skipped entries |

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
// Input / Output
import type { InputData, PathValuePair, GenerateOptions, GenerateResult } from 'path-binder'

// Schema
import type { SchemaObject, SchemaNode, CastFn } from 'path-binder'

// Skip info
import type { ParseSkipped, ParseSkipReason } from 'path-binder'
```

## License

MIT
