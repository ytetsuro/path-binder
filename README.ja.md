# path-binder

複数シートの行データをパス構文で結合し、ネストされた JSON オブジェクトを生成するライブラリです。

スプレッドシートや CSV など「行 × 列」のフラットなデータを、ドット記法のパスに従ってネストされたオブジェクトに変換します。複数シート間のデータマージ、配列操作、スキーマによる型変換をサポートします。

**[ドキュメント](https://path-binder.botch.me)** — 詳細なガイドとインタラクティブな例

## インストール

```bash
npm install path-binder
```

## クイックスタート

```typescript
import { generate, defineSchema, asNumber, asString, arrayOf } from 'path-binder'

const input = {
  sheetA: [  // 主データ（$ なし）
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [  // 参照行（$ あり）
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

### 参照キー `$`

`$` プレフィックスを付けたプロパティは**参照キー**になります。参照キーを含む行は**参照行**として扱われ、`$` なしの**主データ行**で構築されたエンティティに対して、プロパティ値で検索し、データを付与します。

分類はシート単位ではなく**行単位**です。同一シート内に主データ行と参照行を混在させることができます。

#### 基本的な参照

```typescript
const input = {
  sheetA: [  // 主データ（$ なし → 自動グループ化で処理）
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],
  ],
  sheetB: [  // 参照行（$ あり → 主データを検索してデータ付与）
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

- `user.$id` は「user の id プロパティが一致するエンティティを検索する」という意味
- `$id` の値 `1` に一致する Taro のエンティティに `info` が付与される
- キー名の `$` は出力から除去される（`$id` → マッチ条件として使用）

#### 同一条件で複数エンティティにマッチ

参照条件に一致するエンティティが複数ある場合、すべてにデータが付与されます。

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

#### 同一シート内の混在

主データ行と参照行は同じシートに混在できます。

```typescript
const input = {
  sheet1: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }],   // 主データ行
    [{ path: 'user.$id', value: 1 }, { path: 'user.role', value: 'admin' }],  // 参照行
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }],    // 主データ行
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

#### 任意のプロパティを参照

`$key` は `id` に限らず、任意のプロパティで検索できます。

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

#### 複数 $key による AND 検索

複数の `$` キーを使うと、すべての条件を満たすエンティティのみにデータが付与されます。

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
//     { id: 1, type: 'A', name: 'Taro', flag: true },   // $id=1 AND $type='A' → マッチ
//     { id: 2, type: 'A', name: 'Jiro' },                // $id≠1 → 非マッチ
//     { id: 3, type: 'B', name: 'Saburo' },               // $type≠'A' → 非マッチ
//   ]
// }
```

#### 参照行の配列集約

同じ $key 条件を持つ参照行が複数ある場合、それらは自動グループ化されてまとめて付与されます。

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

#### 参照キーの制約

| 制約 | 理由 |
|------|------|
| `$key` はトップレベルの prop セグメントでのみ使用可能 | ネストしたパス（`info[].$type`）の参照マッチが複雑化するため |
| `$key` の値はプリミティブ型（string, number, boolean）に限定 | 配列/オブジェクトの等価比較が定義困難 |
| 同一行内で `$key` と同名の非 `$key` プロパティは共存不可 | `user.$id` と `user.id` が同一行にあると矛盾するため |
| 同一行内の全 `$key` は同一ルートパスに属する | `user.$id` と `product.$code` の混在は検索スコープが曖昧になるため |

### 自動グループ化

`$` キーがない行同士は、配列以外のプロパティ値が一致する場合に自動的にグループ化されます。

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
| `$name` | 参照キー | `user.$id` | id で主データを検索（マッチ条件として使用） |
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

無効なパスや参照エラーを含む入力があった場合、その値はスキップされ、`skipped` に情報が記録されます。

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

参照先が見つからない場合もスキップとして報告されます。

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

### スキップ理由

#### パース系

| reason | 意味 | 例 |
|--------|------|------|
| `empty` | パスが空文字 | `''` |
| `key` | `$` の後に名前がない | `'user.$'` |
| `escape` | `$$` の後に名前がない | `'data.$$'` |
| `unnamed` | `[]` の前に名前がない | `'[0]'` |
| `bracket` | 閉じ括弧 `]` がない | `'foo[bar'` |
| `index` | インデックスが非整数 | `'items[abc]'` |

#### 参照系

| reason | 意味 |
|--------|------|
| `reference_not_found` | $key の参照先エンティティが存在しない |
| `no_primary_data` | 全行が $key 行で主データ行がない |
| `conflicting_key_prop` | 同一行に `$key` と同名の非 `$key` プロパティがある |
| `nested_key` | 配列パス内に `$key` がある（例: `info[].$type`） |
| `invalid_key_value` | `$key` の値が非プリミティブ |
| `mixed_key_root` | 同一行の `$key` が異なるルートパスに属する |
| `property_conflict` | 参照データが主データの既存プロパティと衝突（主データが優先される） |

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
