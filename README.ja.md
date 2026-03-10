# path-binder ドキュメントサイト メンテナンスガイド

このリポジトリの `gh-pages` ブランチには、[mdbook](https://rust-lang.github.io/mdBook/) で構築された path-binder のドキュメントサイトが含まれています。英語 (`en/`) と日本語 (`ja/`) の 2 言語構成です。

## ディレクトリ構成

```
.
├── en/                    # 英語ドキュメント
│   ├── book.toml          #   mdbook 設定
│   └── src/
│       ├── README.md      #   ホームページ
│       ├── SUMMARY.md     #   目次（サイドバー）
│       ├── playground.md  #   プレイグラウンドページ
│       └── usage/         #   使い方ページ群
├── ja/                    # 日本語ドキュメント（en/ と同構成）
│   ├── book.toml
│   └── src/
├── theme/                 # 共有テーマ（en/ja 共通）
│   ├── index.hbs          #   HTML テンプレート
│   ├── css/
│   │   └── custom.css     #   カスタムスタイル
│   └── lang-switch.js     #   言語切替ボタン
├── js/
│   └── playground-loader.js  # StackBlitz 埋め込みスクリプト
├── index.html             # ルートリダイレクト（ブラウザ言語判定）
├── Makefile               # ビルドコマンド
└── .github/workflows/
    └── deploy-docs.yml    # GitHub Pages デプロイ
```

## 前提条件

- [mdbook](https://github.com/rust-lang/mdBook) v0.5.2 以上
- Node.js（ローカルプレビュー用、`npx serve` を使用）

### mdbook のインストール

```bash
# Cargo 経由
cargo install mdbook

# または直接ダウンロード
curl -sSL "https://github.com/rust-lang/mdBook/releases/download/v0.5.2/mdbook-v0.5.2-x86_64-unknown-linux-gnu.tar.gz" \
  | tar -xz -C /usr/local/bin
```

## ビルドとプレビュー

```bash
# 全言語をビルド（website/ ディレクトリに出力）
make build

# ビルド + ローカルサーバー起動（http://localhost:8000/）
make serve

# クリーンビルド
make clean && make build
```

`make build` は以下を実行します：

1. `cd en && mdbook build` → `website/en/` に出力
2. `cd ja && mdbook build` → `website/ja/` に出力
3. `index.html` を `website/index.html` にコピー

## コンテンツの編集

### 既存ページの編集

Markdown ファイルを直接編集します。

- 英語: `en/src/usage/*.md`
- 日本語: `ja/src/usage/*.md`

### 新しいページの追加

1. `en/src/` と `ja/src/` の両方に Markdown ファイルを作成
2. 各言語の `SUMMARY.md` にリンクを追加

```markdown
# Summary（例: ja/src/SUMMARY.md）

- [ホーム](./README.md)
- [使い方]()
  - [パス構文](./usage/path-syntax.md)
  - [スキーマ](./usage/schema.md)
  - [新しいページ](./usage/new-page.md)    ← 追加
```

### ホームページの編集

各言語の `src/README.md` がホームページです。Hero セクションやフィーチャーカードは HTML で書かれています。

## テーマとスタイルのカスタマイズ

### CSS の変更

`theme/css/custom.css` を編集します。このファイルは両言語で共有されます。

> **重要: CSS では必ず `px` 単位を使うこと**
>
> mdbook は `html { font-size: 62.5% }` を設定するため、`1rem = 10px`（通常の 16px ではない）になります。`rem` 単位を使うとフォントサイズが意図の約 62% に縮小されます。

### デザイントークン

`custom.css` の `:root` にデザイントークンが定義されています：

```css
:root {
  --pb-primary: #1a73e8;        /* メインカラー */
  --pb-text-primary: #202124;   /* テキスト色 */
  --pb-text-secondary: #5f6368; /* セカンダリテキスト色 */
  --pb-border: #dadce0;         /* ボーダー色 */
  --pb-surface: #ffffff;        /* 背景色 */
  --pb-surface-variant: #f1f3f4;/* セカンダリ背景色 */
}
```

### HTML テンプレート

`theme/index.hbs` が全ページのベース HTML です。Handlebars テンプレート構文を使用しています。

## 言語切替

- `theme/lang-switch.js` がメニューバーの言語切替ボタン（EN / JA）を制御
- URL パスの `/en/` と `/ja/` を相互に置換してリンク先を決定
- `index.html`（ルート）はブラウザの言語設定で自動リダイレクト

## プレイグラウンド（StackBlitz 埋め込み）

`js/playground-loader.js` が `.playground` クラスの div を検出し、StackBlitz の iframe を生成します。

### プレイグラウンドの追加方法

Markdown 内に以下の HTML を記述します：

```html
<div class="playground"
     data-files="index.html,index.ts"
     data-entry="index.ts"
     data-dependencies='{"path-binder":"latest"}'
     data-dev-dependencies='{"vite":"latest","typescript":"latest"}'>

```html
<!-- index.html のコード -->
```

```typescript
// index.ts のコード
```

</div>
```

- `data-files`: ファイル名をカンマ区切りで指定（コードブロックと順序を対応させる）
- `data-entry`: StackBlitz 上で表示するメインファイル
- `data-dependencies` / `data-dev-dependencies`: package.json に追加する依存関係

## URL ハンドリング

`theme/index.hbs` の `<head>` 内に、末尾スラッシュの問題を解決するスクリプトがあります：

- `/ja` や `/en`（末尾スラッシュなし）→ `/ja/`、`/en/` にリダイレクト
- `/ja/usage/path-syntax/`（ファイル URL の末尾スラッシュ）→ `/ja/usage/path-syntax` に修正

これにより、どの Web サーバー環境でも CSS/JS の相対パスが正しく解決されます。

## デプロイ

`gh-pages` ブランチへの push で GitHub Actions が自動実行されます。

### ワークフロー（`.github/workflows/deploy-docs.yml`）

1. mdbook v0.5.2 をインストール
2. 英語・日本語の両方をビルド
3. `website/` ディレクトリを GitHub Pages にデプロイ

### 手動デプロイ

```bash
# gh-pages ブランチで作業していることを確認
git branch --show-current  # → gh-pages

# ビルドして確認
make clean && make build
make serve

# コミットしてプッシュ
git add .
git commit -m "docs: update documentation"
git push origin gh-pages
```

## カスタム CSS クラス一覧

コンテンツ Markdown 内で使用できる主なクラス：

| クラス名 | 用途 |
|----------|------|
| `.hero` | ホームページの Hero セクション |
| `.tagline` | Hero のサブタイトル |
| `.hero-sub` | Hero の補足テキスト |
| `.cta-buttons` | CTA ボタンコンテナ |
| `.features` | フィーチャーカードのグリッド |
| `.feature-card` | 個別のフィーチャーカード |
| `.before-after` | 変換の Before/After 表示 |
| `.story-section` | 背景付きストーリーセクション |
| `.playground` | StackBlitz プレイグラウンド |
| `.concept-diagram` | 概念図（3 カラム） |
| `.syntax-table` | パス構文テーブル |
| `.skip-category` | スキップ理由のカテゴリヘッダ |
