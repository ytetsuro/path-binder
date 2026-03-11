# プレイグラウンド

Excel ファイル (.xlsx) を選択して、path-binder でネストされた JSON に変換します。下のエリアをクリックしてファイルを選択してください。各シートの2行目が JSON パス、3行目以降がデータです。

**Excel フォーマット例:**

| UserId | UserName | LoginMethod |
|--------|----------|-------------|
| user.id | user.name | user.loginInfo[].type |
| 1 | Taro | ID/Password |
| 2 | Jiro | emailLink |

**[サンプル Excel をダウンロード（単一シート）](sample.xlsx)** | **[サンプル Excel をダウンロード（複数シート・$ 参照）](sample-multi-sheet.xlsx)**

<div class="playground"
  data-files="index.html,index.ts"
  data-template="node"
  data-entry="index.ts"
  data-dependencies='{"path-binder":"latest","exceljs":"latest"}'
  data-dev-dependencies='{"vite":"latest"}'>

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>path-binder プレイグラウンド</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    #dropzone {
      border: 2px dashed #1a73e8;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #5f6368;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    #dropzone.dragover { background-color: rgba(26,115,232,0.08); }
    #output { white-space: pre-wrap; font-family: monospace; margin-top: 16px; }
  </style>
</head>
<body>
  <div id="dropzone">
    クリックして .xlsx ファイルを選択
    <!-- Not using D&D alone: cross-origin iframe nesting blocks drop events. -->
    <input type="file" id="file-input" accept=".xlsx" style="display:none">
  </div>
  <h3>結果</h3>
  <pre id="output">ファイルを待っています...</pre>
  <script type="module" src="./index.ts"></script>
</body>
</html>
```

```typescript
import ExcelJS from 'exceljs'
import { generate, defineSchema, asNumber, asString, arrayOf } from 'path-binder'
import type { InputData, PathValuePair, GenerateResult } from 'path-binder'

// =====================================================================
// ✏️ この関数を編集して、スキーマやオプションを試してみよう！
//
// 例:
//   - 型キャストを追加:    id: asNumber()
//   - skipScope を指定:    generate(inputData, { schema, skipScope: 'row' })
//   - スキーマを外す:      return generate(inputData)
// =====================================================================
function example(inputData: InputData): GenerateResult {
  const schema = defineSchema({
    user: {
      id: asNumber(),
      name: asString(),
      loginInfo: arrayOf({ type: asString() }),
    },
  })

  return generate(inputData, { schema })
}

// Row 1: header labels (ignored by path-binder)
// Row 2: JSON paths
// Row 3+: data values
const PATH_ROW_INDEX = 2

/**
 * Reads an Excel workbook buffer and converts it to path-binder InputData.
 *
 * Uses sheet name as the key and row 2 as paths.
 * Not reading paths from row 1: row 1 is a human-readable header,
 * keeping paths on row 2 makes it easy to swap path definitions
 * without touching the header.
 */
async function excelToInputData(buffer: ArrayBuffer): Promise<InputData> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const inputData: Record<string, PathValuePair[][]> = {}

  workbook.eachSheet((sheet) => {
    const pathRow = sheet.getRow(PATH_ROW_INDEX)
    const paths: string[] = []
    pathRow.eachCell((cell, colNumber) => {
      paths[colNumber] = String(cell.value ?? '')
    })

    const rows: PathValuePair[][] = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= PATH_ROW_INDEX) {
        return
      }

      const pairs: PathValuePair[] = []
      row.eachCell((cell, colNumber) => {
        const path = paths[colNumber]
        if (!path) {
          return
        }
        pairs.push({ path, value: cell.value })
      })

      if (pairs.length > 0) {
        rows.push(pairs)
      }
    })

    inputData[sheet.name] = rows
  })

  return inputData
}

async function processFile(file: File, dropzone: HTMLElement, output: HTMLElement): Promise<void> {
  dropzone.textContent = `読み込み完了: ${file.name}`

  try {
    const buffer = await file.arrayBuffer()
    const inputData = await excelToInputData(buffer)
    const { result, skipped } = example(inputData)

    output.textContent = JSON.stringify(result, null, 2)
    if (skipped.length > 0) {
      output.textContent += '\n\n--- スキップ ---\n' + JSON.stringify(skipped, null, 2)
    }
  } catch (err) {
    output.textContent = 'エラー: ' + String(err)
  }
}

function setupDropzone(): void {
  const dropzone = document.getElementById('dropzone')
  const output = document.getElementById('output')
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null
  if (!dropzone || !output || !fileInput) {
    return
  }

  // Click to open file picker.
  // Not relying on D&D alone: cross-origin iframe nesting blocks drop events.
  dropzone.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) {
      return
    }
    await processFile(file, dropzone, output)
  })

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropzone.classList.add('dragover')
  })

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover')
  })

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault()
    dropzone.classList.remove('dragover')

    const file = e.dataTransfer?.files[0]
    if (!file) {
      return
    }
    await processFile(file, dropzone, output)
  })
}

setupDropzone()
```

</div>

## Excel フォーマットのルール

- **1行目** — 人間が読むヘッダー（無視されます）
- **2行目** — path-binder 用の JSON パス（例: `user.id`, `user.name`, `user.loginInfo[].type`）
- **3行目以降** — データ値
- **シート名** — InputData のトップレベルキーとして使用

## 試してみよう

- `example()` 関数を編集してスキーマを変更してみる
- Excel の2行目のパスを変更してみる
- 2枚目のシートに `$` 参照キーを追加してみる
