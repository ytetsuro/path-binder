# path-binder

複数シートの行データをパス構文で結合し、ネストされた JSON オブジェクトを生成するライブラリです。

スプレッドシートや CSV など「行 × 列」のフラットなデータを、ドット記法のパスに従ってネストされたオブジェクトに変換します。複数シート間のデータマージ、配列操作、スキーマによる型変換をサポートします。

## インストール

```bash
npm install path-binder
```

## クイックスタート

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

## 出力構造

`generate` は**トップレベルキーの値を常に配列として返します**。各グループが配列の 1 要素になります。

```typescript
const { result } = generate({
  sheet1: [
    [{ path: 'user.name', value: 'Taro' }],
  ],
})
// { user: [{ name: 'Taro' }] }
//          ^^^^^^^^^^^^^^^^^  配列の要素として格納される
```

## パス構文

パスはドット `.` 区切りの文字列で、JSON の構造を表現します。

> 以下の例ではトップレベルの配列ラップ `[...]` を省略しています。
> 例: `{ user: { name: value } }` → 実際の出力は `{ user: [{ name: value }] }`

### プロパティ

ドットで区切ると、ネストされたオブジェクトになります。

```
path: 'user.name'        →  { user: { name: value } }
path: 'a.b.c.d'          →  { a: { b: { c: { d: value } } } }
```

### 配列追加 `[]`

プロパティ名に `[]` を付けると、値が配列に追加されます。同じパスに複数の値を設定すると、配列に蓄積されます。

```
path: 'user.tags[]'   (value: 'admin')     →  { user: { tags: ['admin'] } }
path: 'user.tags[]'   (value: 'editor')    →  { user: { tags: ['admin', 'editor'] } }
```

配列の中にオブジェクトを入れることもできます。

```
path: 'user.info[].type'  (value: 'google')    →  { user: { info: [{ type: 'google' }] } }
path: 'user.info[].type'  (value: 'facebook')  →  { user: { info: [{ type: 'google' }, { type: 'facebook' }] } }
```

### インデックス指定 `[n]`

`[n]` で配列の特定位置に値を設定します。

```
path: 'items.list[0]'  (value: 'first')   →  { items: { list: ['first'] } }
path: 'items.list[2]'  (value: 'third')   →  { items: { list: ['first', undefined, 'third'] } }
```

中間セグメントとしても使えます。

```
path: 'data.items[0].name'  (value: 'first')    →  { data: { items: [{ name: 'first' }] } }
path: 'data.items[1].name'  (value: 'second')   →  { data: { items: [{ name: 'first' }, { name: 'second' }] } }
```

### グループキー `$`

`$` プレフィックスを付けたプロパティは **グループキー** になります。同じキー値を持つ行は 1 つのオブジェクトに統合され、出力配列の 1 要素になります。これにより、複数の行や複数のシートに分散したデータを 1 つにまとめることができます。

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

- `$id` の値 `1` が同じ行は、シートをまたいで 1 つのオブジェクトに統合されます
- キー名の `$` は出力から除去されます（`$id` → `id`）

#### 複合キー

複数の `$` キーを使って、複合条件でグループ化できます。

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

#### 自動グループ化

`$` キーがない場合でも、配列以外のプロパティ値が一致する行は自動的にグループ化されます。

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

### エスケープ `$$`

出力に `$` を含むプロパティ名を使いたい場合は `$$` でエスケープします。

```
path: 'data.$$ref'    →  { data: { $ref: value } }
```

### パス構文まとめ

| 構文 | 意味 | 例 | 結果 |
|------|------|------|------|
| `name` | プロパティ | `user.name` | `{ user: { name: value } }` |
| `name[]` | 配列追加 | `user.tags[]` | `{ user: { tags: [value] } }` |
| `name[n]` | インデックス指定 | `list[0]` | `{ list: [value] }` |
| `$name` | グループキー | `user.$id` | グループ化キー（出力は `id`） |
| `$$name` | エスケープ | `data.$$ref` | `{ data: { $ref: value } }` |

## スキーマ

`defineSchema` でスキーマを定義すると、**パスのフィルタリング**と**値の型変換**を行えます。

### 型変換関数

| 関数 | 変換先 | 例 |
|------|--------|------|
| `asString()` | `string` | `42` → `'42'` |
| `asNumber()` | `number` | `'42'` → `42` |
| `asBoolean()` | `boolean` | `1` → `true`, `0` → `false` |
| `asDate()` | `Date` | `'2024-01-01'` → `new Date('2024-01-01')` |
| `asCustom(fn)` | 任意 | ユーザー定義関数で変換 |

### フィルタリング

スキーマに定義されていないパスは出力から除外されます。

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
// extra は除外される
```

### 配列スキーマ

`arrayOf` で配列要素のスキーマを定義します。

```typescript
const schema = defineSchema({
  user: {
    tags: arrayOf(asString()),           // プリミティブ配列
    info: arrayOf({ type: asString() }), // オブジェクト配列
  },
})
```

### 緩いスキーマ（asAny）

`asAny` を使うと、未定義のパスも許可しつつ、一部のプロパティだけ型変換を適用できます。

```typescript
const schema = defineSchema({
  user: asAny({ id: asNumber() }),
})

const { result } = generate(input, { schema })
// id は数値にキャスト、それ以外のプロパティもそのまま出力される
```

### カスタム変換

`asCustom`（エイリアス: `as`）で独自の変換関数を使用できます。

```typescript
import { asCustom } from 'path-binder'
// または
import { as } from 'path-binder'

const schema = defineSchema({
  user: {
    name: asCustom((v) => String(v).toUpperCase()),
  },
})
```

## スキップ処理

無効なパスを含む入力があった場合、その値はスキップされ、`skipped` に情報が記録されます。

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

### スキップ理由

| reason | 意味 | 例 |
|--------|------|------|
| `empty` | パスが空文字 | `''` |
| `key` | `$` の後に名前がない | `'user.$'` |
| `escape` | `$$` の後に名前がない | `'data.$$'` |
| `unnamed` | `[]` の前に名前がない | `'[0]'` |
| `bracket` | 閉じ括弧 `]` がない | `'foo[bar'` |
| `index` | インデックスが非整数 | `'items[abc]'` |

### skipScope オプション

デフォルトでは無効なパスのセルだけがスキップされます（`cell` モード）。`row` モードにすると、1 つでも無効なセルがある行全体をスキップします。

```typescript
const { result } = generate(input, { skipScope: 'row' })
```

## API リファレンス

### `generate(input, options?)`

入力データから JSON オブジェクトを生成します。

**引数:**

| パラメータ | 型 | 説明 |
|---|---|---|
| `input` | `InputData` | シート名をキー、行データ配列を値とするオブジェクト |
| `options.schema` | `SchemaObject` | フィルタリング・型変換用スキーマ（省略可） |
| `options.skipScope` | `'cell' \| 'row'` | スキップの粒度。デフォルト `'cell'` |

**戻り値:** `GenerateResult`

| プロパティ | 型 | 説明 |
|---|---|---|
| `result` | `Record<string, unknown>` | 生成されたオブジェクト（トップレベルの値は常に配列） |
| `skipped` | `ParseSkipped[]` | スキップされたエントリの情報 |

### 入力データ形式

```typescript
type InputData = {
  [sheetName: string]: PathValuePair[][]
}

type PathValuePair = {
  path: string
  value: unknown
}
```

各シートは行の配列で、各行はパスと値のペアの配列です。

### 型エクスポート

```typescript
// 入出力
import type { InputData, PathValuePair, GenerateOptions, GenerateResult } from 'path-binder'

// スキーマ
import type { SchemaObject, SchemaNode, CastFn } from 'path-binder'

// スキップ情報
import type { ParseSkipped, ParseSkipReason } from 'path-binder'
```

## License

MIT
