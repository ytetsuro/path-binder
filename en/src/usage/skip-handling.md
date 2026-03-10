# Skip Handling

path-binder does not throw errors when it encounters invalid data. Instead, it collects unprocessable entries in the `skipped` array and returns them alongside the result. This prevents a single bad row from halting the entire batch.

## Inspecting Skipped Entries

```typescript
import { generate } from 'path-binder'

const { result, skipped } = generate(input, { schema })

skipped.forEach((entry) => {
  console.log(entry.name)    // sheet name
  console.log(entry.index)   // row index
  console.log(entry.path)    // the problematic path string
  console.log(entry.value)   // cell value (stringified)
  console.log(entry.reason)  // skip reason code
})
```

---

## skipScope Option

Controls the granularity of skipping.

| skipScope | Behavior | Recommended For |
|-----------|----------|-----------------|
| `'cell'` (default) | Only the invalid cell is skipped; other cells in the row are processed | User input data (tolerating minor gaps) |
| `'row'` | If any cell in a row is invalid, the entire row is skipped | Strict data conversion (preventing incomplete entities) |

```typescript
// Cell level: only invalid cells are skipped
const cellResult = generate(input, { skipScope: 'cell' })

// Row level: if any cell is invalid, the entire row is skipped
const rowResult = generate(input, { skipScope: 'row' })
```

---

## Common Skips and How to Fix Them

### `empty` — Empty Path Segment

**Triggering input**: `"user..name"` (double dots), `"user."` (trailing dot)

**Fix**: Check the path row and remove extra dots.

### `reference_not_found` — No Matching Reference

**Triggering input**: Sheet2 has `user.$id = 3`, but Sheet1 has no user with `id = 3`

**Fix**: Verify that matching primary data exists in the referenced sheet.

### `cast` — Cast Function Threw an Exception

**Triggering input**: `asNumber()` field receives `"abc"`

**Fix**: Check the input data, or add error handling in `asCustom()`.

---

## Skip Reasons Reference

### Path Syntax Errors

| Code | Description | Example Input |
|------|-------------|---------------|
| `empty` | Path segment is empty | `"user..name"` |
| `bracket` | Unclosed bracket `]` | `"items[0"` |
| `index` | Non-numeric array index | `"items[abc]"` |
| `unnamed` | No property name before `[]` | `"[]"` |
| `escape` | No name after `$$` escape prefix | `"config.$$"` |
| `key` | No name after `$` key prefix | `"user.$"` |

### Reference Key Errors

| Code | Description | Example Input |
|------|-------------|---------------|
| `reference_not_found` | No matching primary row | `$id=3` but no primary `id=3` |
| `no_primary_data` | All rows are reference rows | All paths have `$` prefix |
| `conflicting_key_prop` | Same row has `$key` and non-`$key` with same name | `user.$id` and `user.id` in same row |
| `nested_key` | `$key` inside array path | `info[].$type` |
| `invalid_key_value` | Key value is not a primitive | `$id` value is an object |
| `mixed_key_root` | `$keys` in same row belong to different root paths | `user.$id` and `order.$id` in same row |

### Data Conflict & Cast Errors

| Code | Description | Example Input |
|------|-------------|---------------|
| `property_conflict` | Reference data conflicts with primary data | Both have different values for same property |
| `cast` | Cast function threw an exception | `asNumber()` receives `"abc"` |

---

## Skip Logging Patterns

Example of monitoring skips in production.

```typescript
const { result, skipped } = generate(input, { schema })

// Log when skips occur
if (skipped.length > 0) {
  console.warn(`${skipped.length} entries were skipped`)
  skipped.forEach((s) => {
    console.warn(`  Sheet: ${s.name}, Row: ${s.index + 1}, Path: ${s.path}, Reason: ${s.reason}`)
  })
}

// Generate error report for user feedback
const errorReport = skipped.map((s) =>
  `Row ${s.index + 1}: "${s.path}" — ${s.reason}`
)
```

> **Next step**: See the [API Reference](api-reference.html) for all types and options
