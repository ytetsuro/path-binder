# API Reference

## generate(input, options?)

The main function that transforms flat spreadsheet data into nested JSON.

```typescript
import { generate } from 'path-binder'

const { result, skipped } = generate(input, {
  schema,              // optional: SchemaObject
  skipScope: 'cell',   // optional: 'cell' | 'row' (default: 'cell')
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `InputData` | Yes | `{ path, value }` pair arrays per sheet |
| `options.schema` | `SchemaObject` | No | Type casting and filtering definition |
| `options.skipScope` | `'cell' \| 'row'` | No | Skip granularity (default: `'cell'`) |

### Returns: GenerateResult

```typescript
type GenerateResult = {
  readonly result: Record<string, unknown>
  readonly skipped: readonly ParseSkipped[]
}
```

- **`result`**: Keyed by top-level property, values are always **arrays**. This is because each spreadsheet row corresponds to one entity.

```typescript
// Input: 2 rows with user.name = "Taro", user.name = "Jiro"
// Result: { user: [{ name: 'Taro' }, { name: 'Jiro' }] }
//           ↑ user is always an array
```

- **`skipped`**: Array of entries that could not be processed. See [Skip Handling](skip-handling.html) for details.

---

## InputData Format

3-layer structure: **Sheet → Rows → Cells**

```typescript
type InputData = {
  readonly [sheetName: string]: readonly (readonly PathValuePair[])[]
}
//                               ↑ array of rows    ↑ array of cells (path + value pairs)

type PathValuePair = {
  readonly path: string
  readonly value: unknown
}
```

Visualized:

```
InputData = {
  "Sheet1": [          // ← sheet name
    [                  // ← row 1
      { path, value }, // ← cell 1
      { path, value }, // ← cell 2
    ],
    [                  // ← row 2
      { path, value },
      { path, value },
    ],
  ],
  "Sheet2": [ ... ],   // ← another sheet
}
```

---

## defineSchema(definition)

Defines a schema object.

```typescript
import { defineSchema, asString, asNumber } from 'path-binder'

const schema = defineSchema({
  user: {
    name: asString(),
    age: asNumber(),
  },
})
```

---

## Cast Functions

| Function | Signature | Conversion |
|----------|-----------|-----------|
| `asString()` | `() => SchemaNode` | `String(value)` |
| `asNumber()` | `() => SchemaNode` | `Number(value)` |
| `asBoolean()` | `() => SchemaNode` | `Boolean(value)` |
| `asDate()` | `() => SchemaNode` | `new Date(value)` |
| `asCustom(fn)` | `(fn: CastFn) => SchemaNode` | Custom function |
| `asAny()` | `(partial?: object) => SchemaNode` | No casting (pass all paths) |
| `arrayOf(schema)` | `(schema: SchemaNode \| object) => ArraySchema` | Array element schema |

```typescript
type CastFn = (value: unknown) => unknown
```

---

## Type Exports

```typescript
import type {
  InputData,         // Input data type
  PathValuePair,     // { path: string, value: unknown }
  GenerateOptions,   // generate() options
  GenerateResult,    // generate() return type
  ParseSkipped,      // Skipped entry
  ParseSkipReason,   // Skip reason code
  SchemaObject,      // defineSchema() argument type
  SchemaNode,        // Each schema node
  CastFn,            // Cast function type
  ArraySchema,       // arrayOf() return type
  AnySchema,         // asAny() return type
} from 'path-binder'
```
