# Schema

## Why Use a Schema?

`generate()` works without a schema. So why define one?

### 1. Type Casting — Get the Right Types from Input Data

Input values are often a mix of strings and numbers. With a schema, you can guarantee the types in your output JSON.

```typescript
// Without schema: age remains the string "25"
{ name: 'Taro', age: '25' }

// With asNumber(): age is cast to number 25
{ name: 'Taro', age: 25 }
```

### 2. Filtering — Automatically Exclude Unwanted Columns

Schemas act as an **allowlist**. Only paths defined in the schema are included in the output; everything else is silently excluded. No need to worry about extra columns in the input data polluting your API responses.

```typescript
// Even if input has "Notes" and "Manager" columns, they're excluded if not in the schema
const schema = defineSchema({
  customer: {
    name: asString(),
    email: asString(),
    // ← "Notes" and "Manager" are not defined here, so they're excluded
  },
})
```


---

## Cast Functions

Built-in functions that define type conversion for each field.

| Function | Conversion | Input Example | Output Example |
|----------|-----------|---------------|----------------|
| `asString()` | `String(value)` | `123` | `"123"` |
| `asNumber()` | `Number(value)` | `"42"` | `42` |
| `asBoolean()` | `Boolean(value)` | `"true"` | `true` |
| `asDate()` | `new Date(value)` | `"2024-01-15"` | `Date` object |
| `asCustom(fn)` | Custom function | any | any |

```typescript
import { defineSchema, asString, asNumber, asBoolean, asDate, asCustom } from 'path-binder'

const schema = defineSchema({
  user: {
    name: asString(),
    age: asNumber(),
    active: asBoolean(),
    joinedAt: asDate(),
    score: asCustom((v) => Math.round(Number(v))),
  },
})
```

---

## Array Schema

Use `arrayOf()` to define schemas for array elements.

```typescript
import { defineSchema, asString, asNumber, arrayOf } from 'path-binder'

const schema = defineSchema({
  user: {
    name: asString(),
    // Primitive array
    tags: arrayOf(asString()),
    // Object array
    contacts: arrayOf({
      type: asString(),
      value: asString(),
    }),
  },
})
```

---

## Loose Schema (asAny)

**When to use**: During prototyping when you want all columns to pass through, or when you only need to cast specific fields

```typescript
import { defineSchema, asAny, asNumber } from 'path-binder'

// Pass all paths through without casting
const looseSchema = defineSchema({
  user: asAny(),
})

// Pass all paths through, but cast age to number
const partialSchema = defineSchema({
  user: asAny({
    age: asNumber(),
  }),
})
```

> `asAny()` disables filtering. Paths not defined in the schema will also be included in the output.

---

## Custom Cast

Use `asCustom()` to define arbitrary transformation logic.

### Splitting Comma-Separated Tags

```typescript
const schema = defineSchema({
  product: {
    tags: asCustom((v) => String(v).split(',').map((t) => t.trim())),
    // "food,frozen,sale" → ["food", "frozen", "sale"]
  },
})
```

### Behavior on Exception

When a cast function throws an exception inside `asCustom()`, that entry is [skipped](skip-handling.html).

```typescript
const schema = defineSchema({
  config: {
    priority: asCustom((v) => {
      const n = Number(v)
      if (Number.isNaN(n)) {
        throw new Error('Invalid number')
      }
      return n
    }),
  },
})
```

---

## Schema vs No Schema

| Aspect | Without Schema | With Schema |
|--------|---------------|-------------|
| Type casting | None (raw values) | Controlled by cast functions |
| Column exclusion | Not applied (all paths output) | Acts as allowlist |
| Skip on exception | None | Entries are skipped when a cast function throws |
| Development speed | Fast (no definition needed) | Slightly slower (definition required) |
| Production use | Not recommended | Recommended |

> **Next step**: Set up error handling with [Skip Handling](skip-handling.html)
