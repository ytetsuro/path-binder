# Playground

Drop an Excel file (.xlsx) to convert it into nested JSON using path-binder. The second row of each sheet defines the JSON paths, and rows 3+ are data.

**Excel format example:**

| UserId | UserName | LoginMethod |
|--------|----------|-------------|
| user.id | user.name | user.loginInfo[].type |
| 1 | Taro | ID/Password |
| 2 | Jiro | emailLink |

**[Download sample Excel (single sheet)](sample.xlsx)** | **[Download sample Excel (multi-sheet with $ reference)](sample-multi-sheet.xlsx)**

<div class="playground"
  data-files="index.html,index.ts"
  data-template="node"
  data-entry="index.ts"
  data-dependencies='{"path-binder":"latest","exceljs":"latest"}'
  data-dev-dependencies='{"vite":"latest"}'>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>path-binder Playground</title>
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
    Drop .xlsx file here or click to select
    <!-- Not using D&D alone: cross-origin iframe nesting blocks drop events. -->
    <input type="file" id="file-input" accept=".xlsx" style="display:none">
  </div>
  <h3>Result</h3>
  <pre id="output">Waiting for file...</pre>
  <script type="module" src="./index.ts"></script>
</body>
</html>
```

```typescript
import ExcelJS from 'exceljs'
import { generate, defineSchema, asNumber, asString, arrayOf } from 'path-binder'
import type { InputData, PathValuePair, GenerateResult } from 'path-binder'

// =====================================================================
// ✏️ Edit this function to try different schemas and options!
//
// Try:
//   - Add asNumber() cast:  id: asNumber()
//   - Add skipScope:        generate(inputData, { schema, skipScope: 'row' })
//   - Remove schema:        return generate(inputData)
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
  dropzone.textContent = `Loaded: ${file.name}`

  try {
    const buffer = await file.arrayBuffer()
    const inputData = await excelToInputData(buffer)
    const { result, skipped } = example(inputData)

    output.textContent = JSON.stringify(result, null, 2)
    if (skipped.length > 0) {
      output.textContent += '\n\n--- Skipped ---\n' + JSON.stringify(skipped, null, 2)
    }
  } catch (err) {
    output.textContent = 'Error: ' + String(err)
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

## Excel format rules

- **Row 1** — Human-readable header (ignored)
- **Row 2** — JSON paths for path-binder (e.g. `user.id`, `user.name`, `user.loginInfo[].type`)
- **Row 3+** — Data values
- **Sheet name** — Used as the top-level key in InputData

## What you can try

- Edit the `example()` function to add/change the schema
- Change the paths in row 2 of your Excel
- Add a second sheet with `$` reference keys
