# パス構文

path-binder は `{ path, value }` ペアの `path` を解釈して、フラットなデータをネストされた JSON 構造に変換します。このページでは、パスの書き方とその変換ルールを解説します。

## 全体像: パスが JSON になるまで

まず、変換の全体像を見てみましょう。

<div class="before-after">
  <div class="before-after__input">
    <div class="before-after__label">スプレッドシート（2行目がパス）</div>

| user.name | user.age | user.tags[] |
|-----------|----------|-------------|
| Taro      | 25       | admin       |
| Jiro      | 30       | editor      |

  </div>
  <div class="before-after__arrow">↓</div>
  <div class="before-after__output">
    <div class="before-after__label">生成される JSON</div>

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

パスのドット (`.`) がオブジェクトの階層に、`[]` が配列に対応します。以下で各構文を詳しく見ていきます。

---

## プロパティ（ドット記法）

**いつ使う**: オブジェクトのネスト構造を表現したいとき

ドット (`.`) で区切ることで、ネストされたプロパティを定義します。

| パス | 値 | 生成される JSON |
|------|-----|----------------|
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

> ドットの深さに制限はありません。`a.b.c.d.e` のように自由にネストできます。

---

## 配列追加 `[]`

**いつ使う**: 複数行のデータを配列として集めたいとき

パスの末尾に `[]` を付けると、各行の値が配列の要素として追加されます。

| パス | 行1の値 | 行2の値 | 生成される JSON |
|------|---------|---------|----------------|
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

## インデックスアクセス `[n]`

**いつ使う**: 配列の特定の位置に値をセットしたいとき

`[n]` で配列の n 番目に直接値を設定します。指定されていない位置は `undefined` になります。

| パス | 値 | 生成される JSON |
|------|-----|----------------|
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

## 参照キー `$` — 別シートのデータを結合する

**いつ使う**: 複数のシートに分かれたデータを、共通のキーで1つのオブジェクトに統合したいとき

これは path-binder の最も強力な機能です。リレーショナルデータベースの JOIN に似た操作を、スプレッドシート上で実現します。

### 仕組み

1. **プライマリ行**: 通常のパス（例: `user.id`）を持つ行。ベースとなるデータです
2. **参照行**: `$` 付きパス（例: `user.$id`）を持つ行。`$` を取り除いた名前（`id`）でプライマリ行の値とマッチングされ、データがマージされます

### 例: ユーザーマスタとメールデータの結合

2つのシートがあるとします。

**Sheet1（プライマリ）** — ユーザーの基本情報:

| user.id | user.name |
|---------|-----------|
| 1       | Taro      |
| 2       | Jiro      |

**Sheet2（参照）** — `$` 付きでメール情報を追加:

| user.$id | user.email         |
|----------|--------------------|
| 1        | taro@example.com   |

`user.$id` の `$` を取り除くと `user.id` になります。Sheet2 の `$id = 1` は、Sheet1 の `id = 1`（Taro）とマッチし、メール情報がマージされます。

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

### 参照キーの制約

| 制約 | 説明 |
|------|------|
| プライマリ行が必須 | すべての行が参照行（`$` 付き）だとスキップされます |
| キー値はプリミティブ | `$key` の値は文字列・数値・真偽値のみ（オブジェクトは不可） |
| 同一ルートパス | 同じ行の `$key` は同じルートパスに属する必要があります |
| ネスト不可 | 配列パス内での `$key`（例: `info[].$type`）は使用できません |

> 参照キー関連のエラーが発生した場合は、[スキップ処理](skip-handling.html)ページで詳しい原因と対処法を確認できます。

---

## エスケープ `$$`

**いつ使う**: パス内にリテラルの `$` 文字を含めたいとき

`$` は通常、参照キーの特殊文字として解釈されます。リテラルの `$` を使いたい場合は `$$` でエスケープします。

| パス | 生成される JSON |
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

## 行のグルーピング

**いつ使う**: 同じ対象を表す複数の行を、自動的に1つのオブジェクトにまとめたいとき

配列でないパス（プロパティのみのセグメント）の値がすべて同一の行は、path-binder が自動的に1つのオブジェクトにグルーピングします。配列パス（`[]`）はグルーピングキーに含まれず、その値はグルーピングされたオブジェクト内の配列に集約されます。

これにより、1対多の関係を1つのシートで自然に表現でき、複数シートへの分割や参照キー（`$`）を使う必要がありません。

### 仕組み

1. path-binder は各行の**プロパティのみの値**（`[]` を含まないパス）を調べる
2. プロパティ値が同一の行は**同じオブジェクト**として扱われる
3. それらの行の `[]` パスの値が**配列に集約される**

### 例: 複数のログイン方法を持つユーザー

スプレッドシートのようなフラットデータを想像してください:

| user.id | user.name | user.loginInfo[].type |
|---------|-----------|----------------------|
| 1       | Taro      | emailLink            |
| 1       | Taro      | ID/password          |
| 2       | Jiro      | emailLink            |

最初の2行は `user.id = 1`、`user.name = Taro` という非配列の値がすべて同一なので、1つのユーザーオブジェクトにグルーピングされます。`loginInfo[].type` の値は配列に集約されます。

```typescript
import { generate } from 'path-binder'

const input = {
  Sheet1: [
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }, { path: 'user.loginInfo[].type', value: 'emailLink' }],
    [{ path: 'user.id', value: 1 }, { path: 'user.name', value: 'Taro' }, { path: 'user.loginInfo[].type', value: 'ID/password' }],
    [{ path: 'user.id', value: 2 }, { path: 'user.name', value: 'Jiro' }, { path: 'user.loginInfo[].type', value: 'emailLink' }],
  ],
}

const { result } = generate(input)
// → {
//   user: [
//     { id: 1, name: 'Taro', loginInfo: [{ type: 'emailLink' }, { type: 'ID/password' }] },
//     { id: 2, name: 'Jiro', loginInfo: [{ type: 'emailLink' }] }
//   ]
// }
```

### グルーピングキーの判定基準

| パスの種類 | グルーピングキーに含まれる？ | 例 |
|-----------|--------------------------|-----|
| プロパティのみ (`prop.prop`) | はい | `user.id`, `user.name` |
| 配列追加 (`prop[]`) | いいえ — 配列に集約される | `user.tags[]` |
| ネストされた配列 (`prop.prop[]`) | いいえ — 配列に集約される | `user.loginInfo[].type` |

> **ポイント**: オブジェクトの同一性を決めるのはプロパティパスだけです。配列パスは常に集約され、比較には使われません。

### グルーピングなし vs. グルーピングあり

グルーピングの利点を理解するために、使わない場合と比較してみましょう:

| アプローチ | 必要なシート数 | 複雑さ |
|-----------|--------------|--------|
| **グルーピングなし** | 2枚以上 — 参照キー（`$`）でユーザーデータとログイン方法を結合 | 高い — `$` による結合の理解が必要 |
| **グルーピングあり** | 1枚 — 共通の値を繰り返すだけ | 低い — データを上から下に自然に読める |

シンプルな1対多の関係なら、グルーピングでデータを1か所にまとめられます。データが本当に別のシートに属するケースには、参照キー（`$`）を使いましょう。

---

## 組み合わせパターン

実務でよく使うパスの組み合わせパターンです。

### ネスト + 配列: ユーザーの住所リスト

```typescript
// パス: user.addresses[].city, user.addresses[].zip
// → { user: [{ addresses: [{ city: 'Tokyo', zip: '100-0001' }, ...] }] }
```

### 配列内オブジェクト: 注文明細

```typescript
// パス: order.items[].name, order.items[].price, order.items[].qty
// → { order: [{ items: [{ name: '...', price: 100, qty: 2 }, ...] }] }
```

### 参照キー + 配列: マスタデータの結合

```typescript
// Sheet1: product.id, product.name
// Sheet2: product.$id, product.reviews[].comment
// → プライマリの商品データに、参照行のレビュー配列がマージされる
```

> **次のステップ**: [スキーマ](schema.html)を使って型変換とフィルタリングを設定する
