# API リファレンス

## generate(input, options?)

フラットなスプレッドシートデータをネストされた JSON に変換するメイン関数です。

```typescript
import { generate } from 'path-binder'

const { result, skipped } = generate(input, {
  schema,              // optional: SchemaObject
  skipScope: 'cell',   // optional: 'cell' | 'row'（デフォルト: 'cell'）
})
```

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `input` | `InputData` | はい | シートごとの `{ path, value }` ペア配列 |
| `options.schema` | `SchemaObject` | いいえ | 型キャスト・フィルタリング定義 |
| `options.skipScope` | `'cell' \| 'row'` | いいえ | スキップの粒度（デフォルト: `'cell'`） |

### 戻り値: GenerateResult

```typescript
type GenerateResult = {
  readonly result: Record<string, unknown>
  readonly skipped: readonly ParseSkipped[]
}
```

- **`result`**: トップレベルプロパティをキーとし、値は常に**配列**です。スプレッドシートの各行が1つのエンティティに対応するためです。

```typescript
// 入力: user.name = "Taro", user.name = "Jiro" の2行
// 結果: { user: [{ name: 'Taro' }, { name: 'Jiro' }] }
//        ↑ user は常に配列
```

- **`skipped`**: 処理できなかったエントリの配列。詳細は[スキップ処理](skip-handling.html)を参照。

---

## InputData 形式

3層構造: **シート → 行 → セル**

```typescript
type InputData = {
  readonly [sheetName: string]: readonly (readonly PathValuePair[])[]
}
//                               ↑ 行の配列        ↑ セル（path + value ペア）の配列

type PathValuePair = {
  readonly path: string
  readonly value: unknown
}
```

視覚的に表すと:

```
InputData = {
  "Sheet1": [          // ← シート名
    [                  // ← 1行目
      { path, value }, // ← セル1
      { path, value }, // ← セル2
    ],
    [                  // ← 2行目
      { path, value },
      { path, value },
    ],
  ],
  "Sheet2": [ ... ],   // ← 別シート
}
```

---

## defineSchema(definition)

スキーマオブジェクトを定義します。

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

## キャスト関数

| 関数 | シグネチャ | 変換 |
|------|-----------|------|
| `asString()` | `() => SchemaNode` | `String(value)` |
| `asNumber()` | `() => SchemaNode` | `Number(value)` |
| `asBoolean()` | `() => SchemaNode` | `Boolean(value)` |
| `asDate()` | `() => SchemaNode` | `new Date(value)` |
| `asCustom(fn)` | `(fn: CastFn) => SchemaNode` | カスタム関数で変換 |
| `asAny()` | `(partial?: object) => SchemaNode` | キャストなし（全パス通過） |
| `arrayOf(schema)` | `(schema: SchemaNode \| object) => ArraySchema` | 配列要素のスキーマ定義 |

```typescript
type CastFn = (value: unknown) => unknown
```

---

## 型エクスポート

```typescript
import type {
  InputData,         // 入力データの型
  PathValuePair,     // { path: string, value: unknown }
  GenerateOptions,   // generate() のオプション
  GenerateResult,    // generate() の戻り値
  ParseSkipped,      // スキップされたエントリ
  ParseSkipReason,   // スキップ理由コード
  SchemaObject,      // defineSchema() の引数型
  SchemaNode,        // スキーマの各ノード
  CastFn,            // キャスト関数の型
  ArraySchema,       // arrayOf() の戻り値型
  AnySchema,         // asAny() の戻り値型
} from 'path-binder'
```
