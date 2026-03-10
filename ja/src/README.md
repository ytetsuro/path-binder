# path-binder

<div class="hero">
  <h1>path-binder</h1>
  <p class="tagline">フラットデータにパスを書くだけ。<br>あとは path-binder が構造化する。</p>
  <p class="hero-sub">フラットデータをネストされた JSON に変換する TypeScript ライブラリ</p>
  <div class="cta-buttons">
    <a class="primary" href="usage/path-syntax.html">はじめる</a>
    <a class="secondary" href="playground.html">プレイグラウンドで試す</a>
  </div>
</div>

## こんなデータが、こうなる

<div class="before-after">
  <div class="before-after__input">
    <div class="before-after__label">フラットデータ</div>

| user.name | user.age | user.role |
|-----------|----------|-----------|
| Taro      | 25       | admin     |
| Jiro      | 30       | editor    |

  </div>
  <div class="before-after__arrow">↓</div>
  <div class="before-after__output">
    <div class="before-after__label">JSON 出力</div>

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

各列に JSON パスを書き、データを入れる。`generate()` を呼ぶ。それだけです。

## 3ステップではじめる

**1. インストール**

```bash
npm install path-binder
```

**2. データを用意する**

スプレッドシートの各列を `{ path, value }` ペアに変換します。

```typescript
import { generate } from 'path-binder'

const input = {
  Sheet1: [
    [{ path: 'user.name', value: 'Taro' }, { path: 'user.age', value: 25 }],
    [{ path: 'user.name', value: 'Jiro' }, { path: 'user.age', value: 30 }],
  ],
}
```

**3. 変換する**

```typescript
const { result } = generate(input)
// → {
//   user: [
//     { name: 'Taro', age: 25 },
//     { name: 'Jiro', age: 30 }
//   ]
// }
```

## なぜ path-binder？

<div class="story-section">

toB SaaS 開発で、CSV やスプレッドシートなどのフラットデータを構造化 JSON に変換する必要に迫られたことはありませんか？

**path-binder なら、各カラムに JSON パスのラベルを付けるだけ。** 複雑な変換ロジックは不要です。一度パスを定義すれば、データのレイアウトがどう変わっても、マッピングは壊れません。

</div>

<details>
<summary><strong>「Excel の関数で処理した方が楽では？」</strong></summary>

一度きりの変換ならそうかもしれません。しかし、変化し続けるビジネス要件に合わせて複雑な数式チェーンをメンテナンスし続けるコストは膨大です。path-binder のアプローチ — データモデルに直接マッピングするシンプルなラベル付け — はそのコストを完全に排除します。サポートチームと一緒に導入すれば、運用コストの削減効果は明らかです。

</details>

## 特徴

<div class="features">
  <div class="feature-card">
    <div class="feature-card__icon">0</div>
    <h3 class="feature-card__title">ゼロ依存関係</h3>
    <p class="feature-card__description">外部依存なし。node_modules を汚さず、軽量で高速に動作します。</p>
  </div>
  <div class="feature-card">
    <div class="feature-card__icon">{}</div>
    <h3 class="feature-card__title">型安全</h3>
    <p class="feature-card__description">スキーマ定義に基づく厳密な型推論。TypeScript の恩恵を最大限に活かせます。</p>
  </div>
  <div class="feature-card">
    <div class="feature-card__icon">⚙</div>
    <h3 class="feature-card__title">スキーマ対応</h3>
    <p class="feature-card__description">キャスト・フィルタを宣言的に定義。不要な列は自動除外されます。</p>
  </div>
  <div class="feature-card">
    <div class="feature-card__icon">📊</div>
    <h3 class="feature-card__title">マルチシート</h3>
    <p class="feature-card__description">複数シートのデータを参照キー（$）で自動結合。リレーショナルな構造も1回の呼び出しで。</p>
  </div>
</div>

## さらに高度な使い方

スキーマによる型変換と、`$` 参照キーによるマルチシート結合を組み合わせた例です。

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

> **次のステップ**: [パス構文](usage/path-syntax.html)でネストや配列の表現方法を学ぶ → [スキーマ](usage/schema.html)で型キャストとフィルタリングを設定する → [プレイグラウンド](playground.html)で試す
