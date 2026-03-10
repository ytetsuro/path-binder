# スキップ処理

path-binder は不正なデータに遭遇してもエラーをスローしません。代わりに、処理できなかったエントリを `skipped` 配列に収集して返します。これにより、1行の不正データがバッチ全体を停止させることを防ぎます。

## スキップされたエントリの確認

```typescript
import { generate } from 'path-binder'

const { result, skipped } = generate(input, { schema })

skipped.forEach((entry) => {
  console.log(entry.name)    // シート名
  console.log(entry.index)   // 行インデックス
  console.log(entry.path)    // 問題のあったパス文字列
  console.log(entry.value)   // そのセルの値（文字列化）
  console.log(entry.reason)  // スキップ理由コード
})
```

---

## skipScope オプション

スキップの粒度を制御します。

| skipScope | 動作 | 推奨シーン |
|-----------|------|-----------|
| `'cell'`（デフォルト） | 無効なセルだけスキップし、同じ行の他のセルは処理する | ユーザー入力データ（多少の欠損は許容） |
| `'row'` | 行内のいずれかのセルが無効なら、行全体をスキップ | 厳密なデータ変換（不完全なエンティティを防止） |

```typescript
// セルレベル: 無効なセルのみスキップ
const cellResult = generate(input, { skipScope: 'cell' })

// 行レベル: 1つでも無効なセルがあれば行全体をスキップ
const rowResult = generate(input, { skipScope: 'row' })
```

---

## よくあるスキップと対処法

### `empty` — パスセグメントが空

**発生する入力**: `"user..name"`（ドットが2つ）、`"user."`（末尾ドット）

**対処**: パス行を確認し、余分なドットを削除してください。

### `reference_not_found` — 参照先が見つからない

**発生する入力**: Sheet2 で `user.$id = 3` と書いたが、Sheet1 に `id = 3` のユーザーがいない

**対処**: 参照先のシートにマッチするプライマリデータが存在するか確認してください。

### `cast` — キャスト関数が例外をスロー

**発生する入力**: `asNumber()` を指定したフィールドに `"abc"` が入力された

**対処**: 入力データの内容を確認するか、`asCustom()` でエラーハンドリングを追加してください。

---

## スキップ理由 一覧

### パス構文エラー

| コード | 説明 | 発生する入力例 |
|--------|------|---------------|
| `empty` | パスセグメントが空 | `"user..name"` |
| `bracket` | 閉じ括弧 `]` がない | `"items[0"` |
| `index` | 配列インデックスが数値でない | `"items[abc]"` |
| `unnamed` | `[]` の前にプロパティ名がない | `"[]"` |
| `escape` | `$$` の後に名前がない | `"config.$$"` |
| `key` | `$` の後に名前がない | `"user.$"` |

### 参照キー関連エラー

| コード | 説明 | 発生する入力例 |
|--------|------|---------------|
| `reference_not_found` | 一致するプライマリ行がない | `$id=3` だがプライマリに `id=3` がない |
| `no_primary_data` | 全行が参照行でプライマリがない | すべてのパスに `$` が付いている |
| `conflicting_key_prop` | 同行に `$key` と非 `$key` の同名プロパティ | `user.$id` と `user.id` が同じ行にある |
| `nested_key` | 配列パス内に `$key` がある | `info[].$type` |
| `invalid_key_value` | キー値がプリミティブでない | `$id` の値がオブジェクト |
| `mixed_key_root` | 同行の `$key` が異なるルートパスに属する | `user.$id` と `order.$id` が同行 |

### データ競合・キャストエラー

| コード | 説明 | 発生する入力例 |
|--------|------|---------------|
| `property_conflict` | 参照データがプライマリと競合 | 両方が同じプロパティに異なる値を持つ |
| `cast` | キャスト関数が例外をスロー | `asNumber()` に `"abc"` |

---

## スキップログの活用パターン

本番環境でスキップを監視する例です。

```typescript
const { result, skipped } = generate(input, { schema })

// スキップが発生した場合のログ出力
if (skipped.length > 0) {
  console.warn(`${skipped.length} 件のエントリがスキップされました`)
  skipped.forEach((s) => {
    console.warn(`  シート: ${s.name}, 行: ${s.index + 1}, パス: ${s.path}, 理由: ${s.reason}`)
  })
}

// ユーザーへのフィードバック用レポート生成
const errorReport = skipped.map((s) =>
  `行 ${s.index + 1}: "${s.path}" — ${s.reason}`
)
```

> **次のステップ**: [API リファレンス](api-reference.html)で全ての型とオプションを確認する
