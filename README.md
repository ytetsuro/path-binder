# path-binder Documentation Site Maintenance Guide

The `gh-pages` branch of this repository contains the path-binder documentation site built with [mdbook](https://rust-lang.github.io/mdBook/). It supports two languages: English (`en/`) and Japanese (`ja/`).

## Directory Structure

```
.
├── en/                    # English documentation
│   ├── book.toml          #   mdbook configuration
│   └── src/
│       ├── README.md      #   Home page
│       ├── SUMMARY.md     #   Table of contents (sidebar)
│       ├── playground.md  #   Playground page
│       └── usage/         #   Usage pages
├── ja/                    # Japanese documentation (same structure as en/)
│   ├── book.toml
│   └── src/
├── theme/                 # Shared theme (common to en/ja)
│   ├── index.hbs          #   HTML template
│   ├── css/
│   │   └── custom.css     #   Custom styles
│   └── lang-switch.js     #   Language switcher button
├── js/
│   └── playground-loader.js  # StackBlitz embedding script
├── index.html             # Root redirect (browser language detection)
├── Makefile               # Build commands
└── .github/workflows/
    └── deploy-docs.yml    # GitHub Pages deployment
```

## Prerequisites

- [mdbook](https://github.com/rust-lang/mdBook) v0.5.2 or later
- Node.js (for local preview, uses `npx serve`)

### Installing mdbook

```bash
# Via Cargo
cargo install mdbook

# Or direct download
curl -sSL "https://github.com/rust-lang/mdBook/releases/download/v0.5.2/mdbook-v0.5.2-x86_64-unknown-linux-gnu.tar.gz" \
  | tar -xz -C /usr/local/bin
```

## Build and Preview

```bash
# Build all languages (outputs to website/ directory)
make build

# Build + start local server (http://localhost:8000/)
make serve

# Clean build
make clean && make build
```

`make build` performs the following:

1. `cd en && mdbook build` → outputs to `website/en/`
2. `cd ja && mdbook build` → outputs to `website/ja/`
3. Copies `index.html` to `website/index.html`

## Editing Content

### Editing Existing Pages

Edit the Markdown files directly:

- English: `en/src/usage/*.md`
- Japanese: `ja/src/usage/*.md`

### Adding New Pages

1. Create Markdown files in both `en/src/` and `ja/src/`
2. Add links to each language's `SUMMARY.md`

```markdown
# Summary (example: en/src/SUMMARY.md)

- [Home](./README.md)
- [Usage]()
  - [Path Syntax](./usage/path-syntax.md)
  - [Schema](./usage/schema.md)
  - [New Page](./usage/new-page.md)    ← add this
```

### Editing the Home Page

Each language's `src/README.md` serves as the home page. The hero section and feature cards are written in HTML.

## Theme and Style Customization

### CSS Changes

Edit `theme/css/custom.css`. This file is shared across both languages.

> **Important: Always use `px` units in CSS**
>
> mdbook sets `html { font-size: 62.5% }`, which makes `1rem = 10px` (instead of the usual 16px). Using `rem` units will cause font sizes to render at approximately 62% of the intended size.

### Design Tokens

Design tokens are defined in `:root` of `custom.css`:

```css
:root {
  --pb-primary: #1a73e8;        /* Primary color */
  --pb-text-primary: #202124;   /* Text color */
  --pb-text-secondary: #5f6368; /* Secondary text color */
  --pb-border: #dadce0;         /* Border color */
  --pb-surface: #ffffff;        /* Surface color */
  --pb-surface-variant: #f1f3f4;/* Secondary surface color */
}
```

### HTML Template

`theme/index.hbs` is the base HTML for all pages, using Handlebars template syntax.

## Language Switching

- `theme/lang-switch.js` controls the language switcher button (EN / JA) in the menu bar
- It determines the link target by swapping `/en/` and `/ja/` in the URL path
- `index.html` (root) auto-redirects based on the browser's language setting

## Playground (StackBlitz Embedding)

`js/playground-loader.js` detects divs with the `.playground` class and generates StackBlitz iframes.

### Adding a Playground

Add the following HTML in your Markdown:

```html
<div class="playground"
     data-files="index.html,index.ts"
     data-entry="index.ts"
     data-dependencies='{"path-binder":"latest"}'
     data-dev-dependencies='{"vite":"latest","typescript":"latest"}'>

```html
<!-- index.html code -->
```

```typescript
// index.ts code
```

</div>
```

- `data-files`: Comma-separated file names (must match the order of code blocks)
- `data-entry`: The main file to display in StackBlitz
- `data-dependencies` / `data-dev-dependencies`: Dependencies to add to package.json

## URL Handling

A script in the `<head>` of `theme/index.hbs` resolves trailing slash issues:

- `/ja` or `/en` (no trailing slash) → redirects to `/ja/` or `/en/`
- `/ja/usage/path-syntax/` (trailing slash on file URLs) → corrects to `/ja/usage/path-syntax`

This ensures CSS/JS relative paths resolve correctly regardless of the web server environment.

## Deployment

Pushing to the `gh-pages` branch automatically triggers GitHub Actions.

### Workflow (`.github/workflows/deploy-docs.yml`)

1. Installs mdbook v0.5.2
2. Builds both English and Japanese docs
3. Deploys the `website/` directory to GitHub Pages

### Manual Deployment

```bash
# Confirm you are on the gh-pages branch
git branch --show-current  # → gh-pages

# Build and verify
make clean && make build
make serve

# Commit and push
git add .
git commit -m "docs: update documentation"
git push origin gh-pages
```

## Custom CSS Class Reference

Key classes available for use in content Markdown:

| Class Name | Purpose |
|------------|---------|
| `.hero` | Home page hero section |
| `.tagline` | Hero subtitle |
| `.hero-sub` | Hero supplementary text |
| `.cta-buttons` | CTA button container |
| `.features` | Feature card grid |
| `.feature-card` | Individual feature card |
| `.before-after` | Before/After transformation display |
| `.story-section` | Story section with background |
| `.playground` | StackBlitz playground |
| `.concept-diagram` | Concept diagram (3-column) |
| `.syntax-table` | Path syntax table |
| `.skip-category` | Skip reason category header |
