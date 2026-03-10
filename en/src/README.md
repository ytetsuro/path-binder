# path-binder

<div class="hero">
  <h1>path-binder</h1>
  <p class="tagline">Label your columns with paths.<br>path-binder builds the JSON.</p>
  <p class="hero-sub">A TypeScript library that parses flat data into nested JSON.</p>
  <div class="cta-buttons">
    <a class="primary" href="usage/path-syntax.html">Get Started</a>
    <a class="secondary" href="playground.html">Try Playground</a>
  </div>
</div>

## From Flat Data, To Nested JSON

<div class="before-after">
  <div class="before-after__input">
    <div class="before-after__label">Flat Data</div>

| user.name | user.age | user.role |
|-----------|----------|-----------|
| Taro      | 25       | admin     |
| Jiro      | 30       | editor    |

  </div>
  <div class="before-after__arrow">↓</div>
  <div class="before-after__output">
    <div class="before-after__label">JSON Output</div>

```json
{
  "user": [
    { "name": "Taro", "age": 25, "role": "admin" },
    { "name": "Jiro", "age": 30, "role": "editor" }
  ]
}
```

  </div>
</div>

Write JSON paths as column headers. Fill in the data rows. Call `generate()`. That's it.

## Get Started in 3 Steps

**1. Install**

```bash
npm install path-binder
```

**2. Prepare your data**

Convert each spreadsheet column into `{ path, value }` pairs.

```typescript
import { generate } from 'path-binder'

const input = {
  Sheet1: [
    [{ path: 'user.name', value: 'Taro' }, { path: 'user.age', value: 25 }],
    [{ path: 'user.name', value: 'Jiro' }, { path: 'user.age', value: 30 }],
  ],
}
```

**3. Transform**

```typescript
const { result } = generate(input)
// → {
//   user: [
//     { name: 'Taro', age: 25 },
//     { name: 'Jiro', age: 30 }
//   ]
// }
```

## Why path-binder?

<div class="story-section">

Ever needed to transform flat data — from CSVs, spreadsheets, or databases — into structured JSON in a B2B SaaS product?

**With path-binder, just add JSON path labels to your data columns.** No complex transformation logic needed. Once paths are defined, the mapping works permanently — no matter how the data layout changes.

</div>

<details>
<summary><strong>"Wouldn't Excel formulas be easier?"</strong></summary>

For a one-off conversion, maybe. But maintaining complex formula chains across evolving business requirements creates ongoing support overhead. path-binder's approach — simple labels that map directly to your data model — eliminates that cost entirely. Introduce it with your support team, and the reduction in maintenance effort speaks for itself.

</details>

## Features

<div class="features">
  <div class="feature-card">
    <div class="feature-card__icon">0</div>
    <h3 class="feature-card__title">Zero Dependencies</h3>
    <p class="feature-card__description">No external dependencies. Keeps your node_modules clean — lightweight and fast.</p>
  </div>
  <div class="feature-card">
    <div class="feature-card__icon">{}</div>
    <h3 class="feature-card__title">Type Safe</h3>
    <p class="feature-card__description">Strict type inference based on your schema definition. Get the most out of TypeScript.</p>
  </div>
  <div class="feature-card">
    <div class="feature-card__icon">⚙</div>
    <h3 class="feature-card__title">Schema Support</h3>
    <p class="feature-card__description">Declaratively define casting and filtering. Unwanted columns are automatically excluded.</p>
  </div>
  <div class="feature-card">
    <div class="feature-card__icon">📊</div>
    <h3 class="feature-card__title">Multi Sheet</h3>
    <p class="feature-card__description">Automatically join data across sheets using reference keys ($). Build relational structures in a single call.</p>
  </div>
</div>

## Advanced Usage

Combine schemas for type casting with `$` reference keys for multi-sheet joining.

```typescript
import { generate, defineSchema, asNumber, asString, arrayOf } from 'path-binder'

const input = {
  sheetA: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [
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
// → {
//   user: [
//     { id: 1, name: 'Taro', info: [{ type: 'google' }] },
//     { id: 2, name: 'Jiro' },
//   ]
// }
```

> **Next steps**: Learn [Path Syntax](usage/path-syntax.html) for nesting and arrays → Set up [Schemas](usage/schema.html) for type casting and filtering → Try the [Playground](playground.html)
