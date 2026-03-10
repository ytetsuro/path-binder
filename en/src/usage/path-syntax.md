# Path Syntax

path-binder interprets the `path` in `{ path, value }` pairs to transform flat data into nested JSON structures. This page explains how to write paths and the transformation rules.

## Overview: How Paths Become JSON

Let's start with the big picture of the transformation.

<div class="before-after">
  <div class="before-after__input">
    <div class="before-after__label">Spreadsheet (row 2 = paths)</div>

| user.name | user.age | user.tags[] |
|-----------|----------|-------------|
| Taro      | 25       | admin       |
| Jiro      | 30       | editor      |

  </div>
  <div class="before-after__arrow">↓</div>
  <div class="before-after__output">
    <div class="before-after__label">Generated JSON</div>

```json
{
  "user": [
    { "name": "Taro", "age": 25, "tags": ["admin"] },
    { "name": "Jiro", "age": 30, "tags": ["editor"] }
  ]
}
```

  </div>
</div>

Dots (`.`) in the path correspond to object nesting, and `[]` corresponds to arrays. Let's explore each syntax element in detail.

---

## Property (Dot Notation)

**When to use**: When you want to express nested object structures

Use dots (`.`) to define nested properties.

| Path | Value | Generated JSON |
|------|-------|----------------|
| `name` | `"Taro"` | `{ "name": "Taro" }` |
| `user.name` | `"Taro"` | `{ "user": { "name": "Taro" } }` |
| `user.address.city` | `"Tokyo"` | `{ "user": { "address": { "city": "Tokyo" } } }` |

```typescript
import { generate } from 'path-binder'

const input = {
  Sheet1: [
    [{ path: 'user.name', value: 'Taro' }, { path: 'user.address.city', value: 'Tokyo' }],
  ],
}

const { result } = generate(input)
// → { user: [{ name: 'Taro', address: { city: 'Tokyo' } }] }
```

> There is no limit to dot depth. You can nest freely like `a.b.c.d.e`.

---

## Array Append `[]`

**When to use**: When you want to collect values from multiple rows into an array

Appending `[]` to a path adds each row's value as a new array element.

| Path | Row 1 Value | Row 2 Value | Generated JSON |
|------|-------------|-------------|----------------|
| `tags[]` | `"admin"` | `"editor"` | `{ "tags": ["admin", "editor"] }` |
| `user.skills[]` | `"TypeScript"` | `"React"` | `{ "user": [{ "skills": ["TypeScript", "React"] }] }` |

```typescript
const input = {
  Sheet1: [
    [{ path: 'user.name', value: 'Taro' }, { path: 'user.tags[]', value: 'admin' }],
    [{ path: 'user.name', value: 'Taro' }, { path: 'user.tags[]', value: 'editor' }],
  ],
}

const { result } = generate(input)
// → { user: [{ name: 'Taro', tags: ['admin', 'editor'] }] }
```

---

## Index Access `[n]`

**When to use**: When you want to set a value at a specific position in an array

Use `[n]` to set a value directly at the nth position. Unspecified positions become `undefined`.

| Path | Value | Generated JSON |
|------|-------|----------------|
| `items[0]` | `"first"` | `{ "items": ["first"] }` |
| `items[2]` | `"third"` | `{ "items": [undefined, undefined, "third"] }` |

```typescript
const input = {
  Sheet1: [
    [{ path: 'scores[0]', value: 90 }, { path: 'scores[1]', value: 85 }],
  ],
}

const { result } = generate(input)
// → { scores: [[90, 85]] }
```

---

## Reference Key `$` — Joining Data Across Sheets

**When to use**: When you want to merge data from multiple sheets into a single object using a common key

This is path-binder's most powerful feature. It performs JOIN-like operations — similar to relational databases — directly on spreadsheet data.

### How It Works

1. **Primary rows**: Rows with normal paths (e.g., `user.id`). These form the base data
2. **Reference rows**: Rows with `$`-prefixed paths (e.g., `user.$id`). They are matched against primary rows by removing the `$` (matching `id`), and their data is merged

### Example: Joining User Master with Email Data

Imagine you have two sheets.

**Sheet1 (Primary)** — Basic user information:

| user.id | user.name |
|---------|-----------|
| 1       | Taro      |
| 2       | Jiro      |

**Sheet2 (Reference)** — Adding email via `$`:

| user.$id | user.email         |
|----------|--------------------|
| 1        | taro@example.com   |

Removing `$` from `user.$id` gives `user.id`. Sheet2's `$id = 1` matches Sheet1's `id = 1` (Taro), and the email data is merged.

```typescript
import { generate } from 'path-binder'

const input = {
  Sheet1: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  Sheet2: [
    [{ path: 'user.$id', value: 1 }, { path: 'user.email', value: 'taro@example.com' }],
  ],
}

const { result } = generate(input)
// → {
//   user: [
//     { id: 1, name: 'Taro', email: 'taro@example.com' },
//     { id: 2, name: 'Jiro' }
//   ]
// }
```

### Reference Key Constraints

| Constraint | Description |
|------------|-------------|
| Primary rows required | If all rows are reference rows (all have `$`), they are skipped |
| Primitive key values | `$key` values must be string, number, or boolean (no objects) |
| Same root path | `$keys` in the same row must belong to the same root path |
| No nesting | `$key` inside array paths (e.g., `info[].$type`) is not allowed |

> If you encounter reference key errors, see the [Skip Handling](skip-handling.html) page for detailed causes and solutions.

---

## Escape `$$`

**When to use**: When you want to include a literal `$` character in the path

`$` is normally interpreted as a reference key prefix. To use a literal `$`, escape it with `$$`.

| Path | Generated JSON |
|------|----------------|
| `config.$$ref` | `{ "config": { "$ref": "..." } }` |
| `data.$$type` | `{ "data": { "$type": "..." } }` |

```typescript
const input = {
  Sheet1: [
    [{ path: 'schema.$$ref', value: '#/definitions/User' }],
  ],
}

const { result } = generate(input)
// → { schema: [{ $ref: '#/definitions/User' }] }
```

---

## Combination Patterns

Common path combination patterns used in practice.

### Nesting + Array: User Address List

```typescript
// Paths: user.addresses[].city, user.addresses[].zip
// → { user: [{ addresses: [{ city: 'Tokyo', zip: '100-0001' }, ...] }] }
```

### Objects in Arrays: Order Line Items

```typescript
// Paths: order.items[].name, order.items[].price, order.items[].qty
// → { order: [{ items: [{ name: '...', price: 100, qty: 2 }, ...] }] }
```

### Reference Key + Array: Joining Master Data

```typescript
// Sheet1: product.id, product.name
// Sheet2: product.$id, product.reviews[].comment
// → Primary product data is merged with review arrays from reference rows
```

> **Next step**: Set up type casting and filtering with [Schemas](schema.html)
