# スキーマ

## なぜスキーマが必要か

`generate()` はスキーマなしでも動作します。では、なぜスキーマを定義するのでしょうか？

### 1. 型変換 — 入力値を正しい型に

入力データは文字列や数値が混在していることがあります。スキーマで型を指定すれば、出力 JSON の型を保証できます。

```typescript
// スキーマなし: age が文字列 "25" のまま
{ name: 'Taro', age: '25' }

// asNumber() を使用: age が数値 25 に変換
{ name: 'Taro', age: 25 }
```

### 2. フィルタリング — 不要な列を自動除外

スキーマは**許可リスト**として機能します。定義されたパスのみが出力に含まれ、それ以外は自動的に除外されます。入力データの余分な列が、API のレスポンスを汚染する心配がありません。

```typescript
// 入力データに「備考」「担当者」列があっても、スキーマに定義がなければ除外される
const schema = defineSchema({
  customer: {
    name: asString(),
    email: asString(),
    // ← 「備考」「担当者」はここに定義がないため出力から除外
  },
})
```


---

## キャスト関数

各フィールドの型変換を定義する組み込み関数です。

| 関数 | 変換内容 | 入力例 | 出力例 |
|------|---------|--------|--------|
| `asString()` | `String(value)` | `123` | `"123"` |
| `asNumber()` | `Number(value)` | `"42"` | `42` |
| `asBoolean()` | `Boolean(value)` | `"true"` | `true` |
| `asDate()` | `new Date(value)` | `"2024-01-15"` | `Date` オブジェクト |
| `asCustom(fn)` | カスタム関数 | 任意 | 任意 |

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

## 配列スキーマ

配列の各要素に対するスキーマを `arrayOf()` で定義します。

```typescript
import { defineSchema, asString, asNumber, arrayOf } from 'path-binder'

const schema = defineSchema({
  user: {
    name: asString(),
    // プリミティブ値の配列
    tags: arrayOf(asString()),
    // オブジェクト配列
    contacts: arrayOf({
      type: asString(),
      value: asString(),
    }),
  },
})
```

---

## ルーズスキーマ（asAny）

**いつ使う**: プロトタイプ段階で全列を通したい場合や、一部だけ型変換したい場合

```typescript
import { defineSchema, asAny, asNumber } from 'path-binder'

// 全パスをキャストなしで通す
const looseSchema = defineSchema({
  user: asAny(),
})

// 全パスを通すが、age だけは数値にキャスト
const partialSchema = defineSchema({
  user: asAny({
    age: asNumber(),
  }),
})
```

> `asAny()` はフィルタリングを無効にします。スキーマに定義されていないパスも出力に含まれます。

---

## カスタムキャスト

`asCustom()` で任意の変換ロジックを定義します。

### カンマ区切りタグの分割

```typescript
const schema = defineSchema({
  product: {
    tags: asCustom((v) => String(v).split(',').map((t) => t.trim())),
    // "食品,冷凍,セール" → ["食品", "冷凍", "セール"]
  },
})
```

### 例外スロー時の動作

キャスト関数内で例外がスローされた場合、そのエントリは[スキップ](skip-handling.html)されます。

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

## スキーマあり vs なしの比較

| 項目 | スキーマなし | スキーマあり |
|------|-------------|-------------|
| 型変換 | なし（元の値のまま） | キャスト関数で制御 |
| 不要列の除外 | されない（全パスが出力） | 許可リストとして機能 |
| 例外時のスキップ | なし | キャスト関数が例外をスローした場合、エントリをスキップ |
| 開発速度 | 速い（定義不要） | やや遅い（定義が必要） |
| 本番利用 | 非推奨 | 推奨 |

> **次のステップ**: [スキップ処理](skip-handling.html)でエラーハンドリングを設定する
