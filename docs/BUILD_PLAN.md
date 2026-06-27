# DocuLift — Cursor Build Plan

**Repo path:** `docs/BUILD_PLAN.md`  
**PRD reference:** `docs/PRD.md`  
**Mockup reference:** `docs/mockup.html`  
**Last updated:** June 2026  

---

## How to use this document

This file is the authoritative build sequence for DocuLift. It is written for two audiences:

- **Cursor (plan mode):** Each step is a self-contained prompt. Run one step at a time. Do not proceed to the next step until Claude Code has passed the validation checklist for the current step.
- **Claude Code (validation mode):** After each Cursor build step, run the validation checklist at the bottom of that step. Every item must pass before marking the step complete. If any item fails, feed the failure back to Cursor for correction before moving on.

**Golden rule:** Cursor builds. Claude Code validates. Never skip validation.

---

## Repository structure target

```
doculift/
├── docs/
│   ├── BUILD_PLAN.md        ← this file
│   ├── PRD.md
│   └── mockup.html
├── src-tauri/               ← Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs
│   │   ├── ocr/             ← OCR pipeline crate
│   │   ├── export/          ← PDF, TXT, DOCX export
│   │   ├── db/              ← SQLite / rusqlite
│   │   ├── claude/          ← Claude API integration
│   │   ├── tier/            ← Tier enforcement logic
│   │   └── license/         ← License key validation
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                     ← React + TypeScript frontend
│   ├── components/
│   │   ├── DropZone.tsx
│   │   ├── QueueSidebar.tsx
│   │   ├── DocViewer.tsx
│   │   ├── ExportPanel.tsx
│   │   ├── ClaudePanel.tsx
│   │   └── TrustPill.tsx
│   ├── hooks/
│   ├── store/
│   ├── types/
│   └── App.tsx
├── tests/
│   ├── fixtures/            ← test PDFs, images for validation
│   └── integration/
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Phase 0 — Foundation (Weeks 1–2)

### Step 0.1 — Tauri + Rust project scaffold

**Cursor prompt:**
```
Create a new Tauri v2 project called "doculift" with a React + TypeScript frontend.
Configure Vite as the bundler. Set up Tailwind CSS v3. Use IBM Plex Mono and Inter
from Google Fonts. The app window should be 1400x900, min 1100x700, centered on
launch, with the title "DocuLift". Set the app identifier to "com.doculift.app".
In src-tauri/src/main.rs, add #![deny(unsafe_code)] at the top of every Rust source
file. Create the full directory structure from docs/BUILD_PLAN.md. Initialize a git
repo with a .gitignore covering Rust targets, node_modules, and .env files.
```

**Claude Code validation checklist:**
- [ ] `cargo build` completes without errors or warnings in `src-tauri/`
- [ ] `npm run dev` launches the Tauri window without errors
- [ ] Window title is "DocuLift", dimensions are 1400×900
- [ ] `#![deny(unsafe_code)]` is present in `src-tauri/src/main.rs`
- [ ] `tailwind.config.js` exists and references `./src/**/*.{ts,tsx}`
- [ ] IBM Plex Mono and Inter are loading (check network tab or font face declarations)
- [ ] `.gitignore` covers `/target`, `node_modules`, `.env`
- [ ] All directories from the repo structure target above exist

---

### Step 0.2 — leptess OCR crate integration and smoke test

**Cursor prompt:**
```
Add leptess = "0.14" to src-tauri/Cargo.toml. Create a new module at
src-tauri/src/ocr/mod.rs. In that module, implement a public function:

  pub fn ocr_page(image_path: &str, lang: &str) -> Result<OcrResult, OcrError>

where OcrResult contains: text: String, confidence: f32, page_num: u32.
OcrError should be a custom enum with variants: TesseractInit, ImageLoad, Utf8Error.

Wrap all leptess calls in a dedicated ffi submodule (src/ocr/ffi.rs) so the FFI
boundary is contained. Document the safety invariants at the top of ffi.rs in a
block comment. Do not use #![allow(unsafe_code)] — instead create a targeted
unsafe block with a // SAFETY: comment for each one.

Add a Rust integration test in tests/integration/ocr_test.rs that:
1. Calls ocr_page() on tests/fixtures/sample_typed.png (a synthetic test image
   you should generate using the `image` crate — white background, black text
   saying "DocuLift OCR test 1234")
2. Asserts the returned text contains "DocuLift"
3. Asserts confidence > 0.7
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes including `ocr_test`
- [ ] `leptess` is pinned to an exact version in `Cargo.toml` (e.g. `leptess = "=0.14.0"`)
- [ ] `src/ocr/ffi.rs` exists and every `unsafe` block has a `// SAFETY:` comment
- [ ] `#![deny(unsafe_code)]` is NOT in `ffi.rs` (it should be `#![allow(unsafe_code)]` scoped to that file only, with a module-level doc comment explaining why)
- [ ] `OcrResult` and `OcrError` are defined and exported from `src/ocr/mod.rs`
- [ ] `tests/fixtures/sample_typed.png` exists and is a valid image file
- [ ] No `unwrap()` calls in production code paths (only in tests)

---

### Step 0.3 — Tauri command bridge: OCR invocation from frontend

> **Status: COMPLETE** — merged with Step 0.4 during implementation. See Step 0.4 notes.

**What was built:** `process_file` in `src-tauri/src/commands.rs` handles both images and PDFs from the start (returning `Vec<OcrResult>`). `src/types/ocr.ts` defines `OcrResult`, `OcrResultList`, and `OcrError`. Temporary test buttons exist in `App.tsx` with `// TODO: remove in Step 1.1` comments.

**Claude Code validation checklist:**
- [x] `cargo build` passes
- [x] `npm run build` passes with no TypeScript errors
- [x] The Tauri command is registered in `lib.rs` via `.invoke_handler(tauri::generate_handler![commands::process_file])`
- [x] File extension validation rejects `.exe`, `.js` with a clear error string
- [x] `src/types/ocr.ts` exports `OcrResult` and `OcrError` interfaces
- [x] No `any` types in `ocr.ts`
- [x] The temporary test button exists in `App.tsx` with a `// TODO: remove in Step 1.1` comment

---

### Step 0.4 — PDF page rasterization pipeline

> **Status: COMPLETE** — implemented alongside Step 0.3.
>
> **Implementation notes:**
> - Uses `pdfium-render = "0.8.37"` + `pdfium-auto = "0.3"` (auto-linker for the pdfium binary).
> - `pdfium-auto` requires the pdfium shared library to be present at link time; the CI workflow downloads it from `bblanchon/pdfium-binaries` before `cargo test`.
> - `RasterizedPages` is a RAII wrapper (not `Vec<RasterizedPage>` directly) so temp files are cleaned up on drop.
> - `ocr_page_with_number(path, lang, page_num)` was added as a public companion to `ocr_page()` for the PDF pipeline.

**Claude Code validation checklist:**
- [x] `cargo test` passes including the new PDF integration test
- [x] Temp files in `std::env::temp_dir()/doculift/` are deleted after processing
- [x] 300 DPI rasterization is explicitly set (`RENDER_DPI = 300`)
- [x] `process_file` returns `Vec<OcrResult>` for both images and PDFs
- [x] `src/types/ocr.ts` updated to reflect `Vec<OcrResult>` return type (`OcrResultList`)
- [x] `tests/fixtures/sample_typed.pdf` exists and is a valid 2-page PDF

---

### Step 0.5 — CI pipeline

**Cursor prompt:**
```
Create .github/workflows/ci.yml that runs on every push to main and on every
pull request. The pipeline should:

1. Check out code
2. Install Rust stable via rustup
3. Install Node.js 20 via actions/setup-node
4. Install system dependencies for leptess on Ubuntu:
   apt-get install -y libleptonica-dev libtesseract-dev tesseract-ocr
5. Run: cargo fmt --check
6. Run: cargo clippy -- -D warnings
7. Run: cargo test
8. Run: npm ci
9. Run: npm run build (Vite build only, not Tauri bundle — no GUI in CI)
10. Run: npx tsc --noEmit

Cache: cargo registry, cargo target directory, and node_modules.
The pipeline must fail if any step exits non-zero.
```

**Claude Code validation checklist:**
- [ ] `.github/workflows/ci.yml` is valid YAML (run `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`)
- [ ] All 10 steps are present in order
- [ ] Caching is configured for `~/.cargo/registry`, `~/.cargo/git`, `target/`, and `node_modules/`
- [ ] The workflow triggers on both `push: branches: [main]` and `pull_request:`
- [ ] `cargo clippy -- -D warnings` is present (warnings as errors)
- [ ] `npx tsc --noEmit` is present

---

## Phase 1 — Core MVP (Weeks 3–6)

### Step 1.1 — App shell and layout

**Cursor prompt:**
```
Build the full application shell in React + TypeScript matching docs/mockup.html.
Remove the temporary test button from App.tsx.

The layout is a three-column desktop shell:
- Top bar (48px): logo, nav (Process / History / Settings), trust pill, tier badge, avatar
- Left sidebar (240px): queue list + usage stats
- Center canvas (flex-1): toolbar + scrollable content area
- Right sidebar (280px): tabbed panel (Export / Claude AI / History)
- Status bar (26px): processing status items

Implement these components as separate files in src/components/:
- TopBar.tsx: includes the TrustPill component (amber pill, pulsing dot,
  "Processing locally · no network" text). TrustPill state: 'idle' | 'processing' | 'network'
  The dot pulses only when state = 'processing'. When state = 'network' (Claude API call
  in progress), it shows "Connecting to Claude API · encrypted" in a muted blue variant.
- QueueSidebar.tsx: renders queue items with status dots and usage meters
- Canvas.tsx: toolbar + drop zone + document viewer area
- RightPanel.tsx: tab controller
- StatusBar.tsx: bottom bar
- DropZone.tsx: the drag-and-drop target (see Step 1.2)

Use Tailwind for all styling. Define a design token file at src/styles/tokens.css
with the CSS variables from the mockup: --paper, --paper-2, --paper-3, --chrome,
--chrome-2, --chrome-3, --chrome-4, --amber, --amber-dim, --amber-bg, --sage,
--sage-bg, --red, --red-bg, --text-main, --text-sub, --text-dim.

All components must be typed — no implicit any. Use React.FC<Props> with explicit
prop interfaces for every component.
```

**Claude Code validation checklist:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] All 7 components exist as `.tsx` files in `src/components/`
- [ ] `src/styles/tokens.css` exists and defines all 17 CSS variables listed above
- [ ] `TrustPill` accepts a `state: 'idle' | 'processing' | 'network'` prop
- [ ] No component uses `any` type
- [ ] No inline styles — all styling via Tailwind classes or CSS variables
- [ ] The temporary test button is gone from `App.tsx`
- [ ] IBM Plex Mono is applied to all monospace elements (queue filenames, stats, confidence scores)
- [ ] The app renders without console errors in `npm run dev`

---

### Step 1.2 — Drag-and-drop file ingestion

**Cursor prompt:**
```
Implement drag-and-drop file ingestion in src/components/DropZone.tsx.

The component should:
1. Accept drag events for files with extensions: .pdf, .png, .jpg, .jpeg, .tiff, .tif
2. On drag-enter: highlight the drop zone with amber border and background
3. On drag-over: show file count badge ("3 files")
4. On drop: validate each file's extension client-side, reject invalid types with
   an inline error message (do not use alert())
5. On valid drop: emit an onFilesAccepted(files: FileQueueItem[]) callback

Define FileQueueItem in src/types/queue.ts:
  interface FileQueueItem {
    id: string           // uuid v4
    name: string
    path: string         // absolute path from Tauri file drop
    size: number         // bytes
    extension: 'pdf' | 'png' | 'jpg' | 'jpeg' | 'tiff' | 'tif'
    status: 'waiting' | 'processing' | 'done' | 'error'
    pageCount?: number
    progress?: number    // 0–100
    error?: string
  }

Use Tauri's onDrop event API (not the browser File API) to get absolute file
paths — the browser File API does not give us real filesystem paths.

In src/store/queueStore.ts, create a Zustand store that holds:
  - items: FileQueueItem[]
  - addItems(files: FileQueueItem[]): void
  - updateItem(id: string, patch: Partial<FileQueueItem>): void
  - removeItem(id: string): void
  - clearCompleted(): void

QueueSidebar.tsx should read from this store and render each item with:
- File type icon (color-coded: PDF=red, JPG=green, TIFF=blue)
- Filename (truncated with ellipsis)
- Page count + file size
- Status dot (done=sage, processing=amber pulsing, waiting=gray)
- In-progress items show a progress bar
```

**Claude Code validation checklist:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `src/types/queue.ts` exports `FileQueueItem` with all 9 fields
- [ ] `src/store/queueStore.ts` exists and uses Zustand
- [ ] The Zustand store exports `useQueueStore` hook
- [ ] `DropZone.tsx` uses Tauri's drop API, not `event.dataTransfer.files`
- [ ] Rejected file types display an inline error, not `window.alert()`
- [ ] Dragging a `.exe` file over the drop zone shows a rejection message
- [ ] `FileQueueItem.id` is generated with `crypto.randomUUID()` or a uuid library
- [ ] `QueueSidebar` re-renders reactively when the store updates (verify with React DevTools or a basic test)

---

### Step 1.3 — OCR processing pipeline: frontend to backend

**Cursor prompt:**
```
Wire the file queue to the Tauri OCR backend.

In src/hooks/useOcrProcessor.ts, implement a hook that:
1. Watches the Zustand queue store for items with status = 'waiting'
2. Processes items one at a time (sequential, not parallel)
3. For each item:
   a. Sets status = 'processing'
   b. Calls the Tauri command process_file(path, lang="eng")
   c. Listens for progress events emitted from the Rust backend
      (Rust should emit a Tauri event "ocr:progress" with payload
       { id: string, page: number, total: number, confidence: number })
   d. Updates item.progress = (page / total) * 100 in the store
   e. On completion: sets status = 'done', stores OcrResult array
   f. On error: sets status = 'error', stores error message

In src-tauri/src/ocr/mod.rs, update the process_file command to emit
per-page progress events using the Tauri v2 AppHandle API:

1. Accept an `app: tauri::AppHandle` parameter (Tauri v2 — NOT `tauri::Window`).
2. Before calling `spawn_blocking`, clone the handle: `let app = app.clone()`.
3. Move the cloned handle into the `spawn_blocking` closure.
4. After each page is processed, call the synchronous emit variant:
   app.emit("ocr:progress", ProgressPayload { id, page, total, confidence })
      .unwrap_or_default();
   (The synchronous `emit` method is available on `AppHandle` in Tauri v2 and
   is safe to call from a blocking thread.)

Do NOT use `window: tauri::Window` — that Tauri v1 type is replaced by
`tauri::WebviewWindow` in v2, and commands should prefer `AppHandle` for
app-wide event emission.

In DocViewer.tsx (src/components/DocViewer.tsx), build the document viewer panel:
- Shows the currently active (processing) document
- Left strip: page thumbnails (80px wide), each showing a mini representation
  of the page and its status (done/processing/waiting)
- Main area: shows the live OCR text preview for the most recently completed page
- Per-page confidence bars (one row per completed page: page label, bar, percentage)
- Main progress bar at top (overall percentage across all pages)
- Cancel button that calls a cancelOcr() function (for now: clears the item
  from the queue and removes its temp files via a Tauri command)
```

**Claude Code validation checklist:**
- [ ] `cargo build` passes
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `src/hooks/useOcrProcessor.ts` exists and exports `useOcrProcessor`
- [ ] The hook processes items sequentially (verify: if two items are in the queue, the second does not start until the first emits `status = 'done'`)
- [ ] `process_file` accepts `app: tauri::AppHandle` (not `window: tauri::Window`) — grep for `AppHandle` in `commands.rs`
- [ ] Progress events are emitted from Rust and received in TypeScript (add a `console.log` in the hook for now to verify in dev mode)
- [ ] `DocViewer.tsx` exists in `src/components/`
- [ ] `DocViewer` shows a confidence score for each completed page
- [ ] The cancel button exists and is wired to a Tauri command
- [ ] No document bytes are logged to console or stored in the Zustand store — only `OcrResult` (text + confidence + page_num)

---

### Step 1.4 — PDF searchable output export

**Cursor prompt:**
```
Implement PDF export in src-tauri/src/export/pdf.rs.

The function signature:
  pub fn export_searchable_pdf(
    source_pdf_path: &str,
    ocr_results: &[OcrResult],
    output_path: &str,
  ) -> Result<(), ExportError>

Behavior:
1. Open the source PDF with lopdf
2. For each page, embed the OCR text as an invisible text layer on top of the
   original page content (standard searchable PDF technique: font size 0 or
   white text positioned to match the original layout)
3. Save to output_path

For image-source files (PNG, JPG, TIFF), implement:
  pub fn image_to_searchable_pdf(
    source_image_path: &str,
    ocr_result: &OcrResult,
    output_path: &str,
  ) -> Result<(), ExportError>

This embeds the image as the page background and the OCR text as the invisible layer.

ExportError should be an enum with variants: Io(std::io::Error), Pdf(String),
InvalidInput(String).

Expose a Tauri command:
  #[tauri::command]
  async fn export_file(
    source_path: String,
    ocr_results: Vec<OcrResult>,
    format: String,          // "pdf" | "txt" — DOCX comes in Step 2.1
    output_dir: String,
  ) -> Result<String, String>  // returns output file path on success

Register this command in main().

Add an integration test that:
1. Runs OCR on tests/fixtures/sample_typed.pdf
2. Exports to a searchable PDF at a temp path
3. Re-opens the exported PDF with lopdf
4. Asserts the text layer contains "DocuLift"
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes including the PDF export integration test
- [ ] The exported PDF opens in a standard PDF reader without corruption (test manually on macOS and Windows)
- [ ] The invisible text layer does not visually alter the document (white or 0-size text only)
- [ ] `export_file` command is registered in `main()`
- [ ] `format` parameter rejects values other than `"pdf"` and `"txt"` with a clear error
- [ ] `ExportError` variants all implement `std::fmt::Display`
- [ ] No `unwrap()` in production export code paths

---

### Step 1.5 — Plain text export and ExportPanel UI

**Cursor prompt:**
```
Implement TXT export in src-tauri/src/export/txt.rs:

  pub fn export_txt(
    ocr_results: &[OcrResult],
    output_path: &str,
  ) -> Result<(), ExportError>

Behavior:
1. Join page texts with "\n\n--- Page N ---\n\n" separators
2. Normalize whitespace: collapse 3+ consecutive newlines to 2
3. Write UTF-8 encoded output to output_path

Update the export_file Tauri command to handle format = "txt".

Build ExportPanel.tsx (src/components/ExportPanel.tsx):
- Four format option cards: PDF (free), DOCX (standard — locked with a lock icon
  and "Upgrade to Standard" tooltip), TXT (free), CSV (premium — locked)
- Selected format is highlighted with amber border
- "Save location" row: shows current output dir path (default: ~/Documents/DocuLift/),
  a "Change" button that opens Tauri's file dialog for folder selection
- "Export" button: calls invoke("export_file") with the active document's data
- On success: show an inline success state ("Saved to ~/Documents/DocuLift/filename.pdf")
- On error: show an inline error message in red

The ExportPanel should be wired into RightPanel.tsx under the "Export" tab.
The active document (the most recently completed item in the queue) should be
the export target. If no document is complete, show an empty state:
"Process a document to export it."
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] TXT export produces valid UTF-8 output (verify with `file` command on the output)
- [ ] Page separator format is exactly `\n\n--- Page N ---\n\n`
- [ ] `ExportPanel.tsx` exists and is imported in `RightPanel.tsx`
- [ ] Locked formats (DOCX, CSV) show a lock icon and are not clickable
- [ ] The "Change" button opens a native folder picker (Tauri dialog, not a browser dialog)
- [ ] Export success shows the full output path inline (not a toast for the first version)
- [ ] Empty state renders when `completedItems.length === 0`

---

### Step 1.6 — Page limit enforcement and tier state

**Cursor prompt:**
```
Implement tier enforcement in src-tauri/src/tier/mod.rs.

Define:
  pub enum Tier { Free, Standard, Premium, WhiteGlove }

  pub struct TierLimits {
    pub pages_per_month: Option<u32>,    // None = unlimited
    pub claude_requests_per_month: Option<u32>,
    pub batch_processing: bool,
    pub max_batch_size: Option<u32>,
    pub docx_export: bool,
    pub csv_export: bool,
    pub multi_language: bool,
  }

  impl Tier {
    pub fn limits(&self) -> TierLimits { ... }
  }

  // Free: 25 pages, 50 claude, no batch, no docx, no csv, no multi-lang
  // Standard: 200 pages, 200 claude, batch up to 10, docx yes, csv no, no multi-lang
  // Premium: unlimited pages, 500 claude, unlimited batch, all formats, multi-lang yes
  // WhiteGlove: unlimited everything

In src-tauri/src/db/mod.rs, set up SQLite via rusqlite:
  - Database file: app data dir / "doculift.db"
    In Tauri v2, resolve this path via the AppHandle:
      app_handle.path().app_data_dir()?
    Do NOT use the removed `tauri::api::path::app_data_dir()` (Tauri v1 API).
    The Tauri commands that initialize the DB should accept `app: tauri::AppHandle`.
  - Table: usage (id INTEGER PRIMARY KEY, month TEXT, pages_processed INTEGER,
    claude_requests INTEGER)
  - Table: settings (key TEXT PRIMARY KEY, value TEXT)
  - Store current tier in settings: key = "tier", value = "free" | "standard" etc.
  - On first launch, insert default row: tier = "free", usage for current month = 0

Expose Tauri commands:
  get_tier() -> Result<String, String>
  get_usage() -> Result<UsageStats, String>   // { pages_used, pages_limit, claude_used, claude_limit }
  check_page_allowance(pages_requested: u32) -> Result<bool, String>

In useOcrProcessor.ts, before starting each file:
1. Call check_page_allowance(item.pageCount)
2. If false: set item.status = 'error', item.error = "Monthly page limit reached. Upgrade to continue."
3. If true: proceed with OCR, then call a Rust command record_usage(pages: u32) after completion

In QueueSidebar.tsx, render the usage meters at the bottom:
- "Pages used: 87 / 200" with a progress bar
- "Claude requests: 31 / 200" with a purple progress bar
- Pull data from a useUsageStore Zustand store that polls get_usage() on mount
  and after each completed document
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `doculift.db` is created in the correct app data directory on first launch
- [ ] `usage` and `settings` tables exist with correct schemas (verify with `sqlite3 doculift.db .schema`)
- [ ] `check_page_allowance` returns `false` when pages_processed + pages_requested > limit
- [ ] Processing is blocked with an error message (not a crash) when the limit is reached
- [ ] Usage meters in `QueueSidebar` update after each completed document without a page reload
- [ ] `Tier::limits()` returns correct values for all four tiers (write a unit test for this)
- [ ] Database is NOT stored in the document or temp directory — only in the app data dir

---

## Phase 2 — Paid Features (Weeks 7–9)

### Step 2.1 — DOCX export

**Cursor prompt:**
```
Implement DOCX export in src-tauri/src/export/docx.rs using the docx-rs crate.

  pub fn export_docx(
    ocr_results: &[OcrResult],
    output_path: &str,
  ) -> Result<(), ExportError>

Behavior:
1. Create a new DOCX document
2. For each page's OCR text:
   a. Attempt basic heading detection: if a line is ALL CAPS and <= 60 chars,
      treat it as a Heading 2
   b. Treat blank-line-separated blocks as paragraphs
   c. Preserve paragraph breaks between pages with a "--- Page N ---" style separator
3. Set document font to Calibri 11pt body, 14pt headings
4. Write to output_path

Update the export_file Tauri command to handle format = "docx".
Update ExportPanel.tsx to unlock DOCX when tier = "standard" or higher.
Update the format cards to show the correct tier badge per format.

Add an integration test that:
1. Runs OCR on tests/fixtures/sample_typed.pdf
2. Exports to DOCX
3. Re-opens with docx-rs and asserts at least one paragraph contains "DocuLift"
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes including the DOCX integration test
- [ ] The exported DOCX opens without errors in Microsoft Word and LibreOffice
- [ ] Heading detection correctly promotes ALL CAPS short lines (verify manually)
- [ ] DOCX export is blocked at the Rust layer for Free tier (returns `ExportError::TierRestricted`)
- [ ] ExportPanel shows DOCX as unlocked when `tier = "standard"` in the settings DB
- [ ] `export_file` command handles `format = "docx"` correctly

---

### Step 2.2 — Batch processing

**Cursor prompt:**
```
Implement batch processing support.

In useOcrProcessor.ts:
1. When multiple files are in the queue, process them sequentially (no parallelism)
2. Show a batch progress indicator in the top bar: "Processing 3 of 7 files"
3. After all files complete, show a batch summary toast:
   "Batch complete — 7 files, 43 pages, 2 errors"

In src-tauri/src/tier/mod.rs, add batch enforcement:
- Free tier: reject if queue.length > 1 (show "Batch processing requires Standard")
- Standard tier: reject if queue.length > 10 (show "Standard plan supports up to 10 files")
- Premium and WhiteGlove: no limit

Add a Tauri command:
  check_batch_allowance(file_count: u32) -> Result<BatchAllowance, String>
  // BatchAllowance: { allowed: bool, max_files: Option<u32>, reason: Option<String> }

Call this before the queue starts processing. If not allowed, mark excess items
as error with the reason string.

In QueueSidebar.tsx, add a "Clear completed" button at the bottom that calls
clearCompleted() on the Zustand store.
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Dropping 3 files as a Free tier user marks 2 of them as errors with the upgrade message
- [ ] Dropping 11 files as a Standard tier user marks 1 as error
- [ ] Batch processes files strictly sequentially (not in parallel)
- [ ] Batch summary toast appears after all items in the queue reach done or error state
- [ ] "Clear completed" button removes only done/error items, not processing or waiting items

---

### Step 2.3 — Claude API integration

**Cursor prompt:**
```
Implement Claude API integration in src-tauri/src/claude/mod.rs.

  pub struct ClaudeClient {
    api_key: String,
    model: ClaudeModel,
    http: reqwest::Client,
  }

  pub enum ClaudeModel {
    Haiku,    // claude-haiku-4-5-20251001  (Free tier)
    Sonnet,   // claude-sonnet-4-6          (Standard + Premium)
    Opus,     // claude-opus-4-6            (White Glove)
  }

  impl ClaudeClient {
    pub async fn cleanup_ocr_text(&self, raw_text: &str) -> Result<String, ClaudeError>
    pub async fn summarize_document(&self, text: &str) -> Result<String, ClaudeError>
  }

CRITICAL SECURITY RULES — enforce these in code, not just documentation:
1. The API key must be stored in the OS keychain (use the `keyring` crate),
   NOT in the SQLite database, NOT in a .env file, NOT in tauri.conf.json
2. The Claude client must NEVER transmit anything other than plain text strings
   to the API. No file paths, no binary data, no base64 images.
3. Before any API call, check tier limits via the db module. If the user has
   reached their monthly Claude request limit, return ClaudeError::QuotaExceeded
   immediately without making a network request.
4. After each successful API call, increment the claude_requests counter in SQLite.
5. The API key input UI must require explicit user action (a dedicated "Connect Claude"
   settings screen, not an auto-prompt). This screen is built in Step 2.4.

For the cleanup_ocr_text prompt, use:
  "You are a document cleanup assistant. The following text was extracted by OCR
   and may contain errors. Fix obvious OCR errors (misread characters, broken words,
   incorrect spacing), normalize formatting, and return only the cleaned text with
   no commentary, preamble, or explanation:\n\n{raw_text}"

For summarize_document, use:
  "Summarize the following document in 3-5 sentences. Be factual and specific.
   Do not include preamble or meta-commentary:\n\n{text}"

Expose Tauri commands:
  run_claude_cleanup(doc_id: String, raw_text: String) -> Result<String, String>
  run_claude_summary(doc_id: String, text: String) -> Result<String, String>
  get_claude_status() -> Result<ClaudeStatus, String>
  // ClaudeStatus: { api_key_set: bool, model: String, requests_used: u32, requests_limit: Option<u32> }
```

**Claude Code validation checklist:**
- [ ] `cargo build` passes
- [ ] The `keyring` crate is used for API key storage (grep for `keyring` in `Cargo.toml`)
- [ ] There is NO code path that stores the API key in SQLite or any file (grep for the key variable being passed to any file-writing function)
- [ ] `ClaudeClient` will not compile if `reqwest` is used outside of `claude/mod.rs` (verify the module structure enforces this)
- [ ] `run_claude_cleanup` and `run_claude_summary` both check quota before making any network call
- [ ] `ClaudeError::QuotaExceeded` is returned (not a panic) when quota is hit
- [ ] The model string in the API call matches the correct Anthropic model ID for the tier
- [ ] No document file bytes, paths, or binary data are present in the API request body (add a test that mocks the HTTP call and inspects the request body)

---

### Step 2.4 — Claude settings screen and ClaudePanel UI

**Cursor prompt:**
```
Build the Claude settings screen and the ClaudePanel component.

In src/components/settings/ClaudeSettings.tsx:
- "Connect Claude AI" screen accessible from the Settings nav item
- API key input field (type="password", never type="text")
- Before saving: validate the key starts with "sk-ant-" and is > 40 chars
- Save button calls a Tauri command save_claude_api_key(key: String)
- After saving, show: "Claude connected · [model name] · [tier]"
- A "Disconnect" button that calls clear_claude_api_key() and removes from keychain
- A clear consent notice:
  "When you use Claude features, the extracted text from your document will be sent
   to Anthropic's API. Your document files are never transmitted — only the text
   that OCR has already extracted. Claude features are always opt-in."
- Consent checkbox that must be checked before the Save button is enabled

In src/components/ClaudePanel.tsx (inside RightPanel's "Claude AI" tab):
- Shows current Claude status (connected / not connected)
- If not connected: "Connect Claude in Settings to enable AI features" with a link
- If connected:
  - Document summary box (shows the summary for the active completed document)
    with a purple left border accent and a blinking cursor while streaming
  - Token usage row: "~420 tokens used this doc" with a small progress bar
  - Three action buttons:
    - "Clean up OCR text" (Standard+) — calls run_claude_cleanup
    - "Explain in plain language" (Standard+) — calls run_claude_summary
    - "Extract key data fields" (Premium — locked with tooltip)
  - Locked buttons are visually dimmed, cursor: not-allowed, show tier badge
- Update useOcrProcessor.ts: after OCR completes on a document, if Claude is
  connected and tier >= Standard, automatically call run_claude_summary and
  store the result in a new Zustand store: useClaudeStore

In the Tauri backend, add:
  save_claude_api_key(key: String) -> Result<(), String>  // stores in keychain
  clear_claude_api_key() -> Result<(), String>             // removes from keychain
```

**Claude Code validation checklist:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] API key input is `type="password"` — verify in rendered HTML
- [ ] The consent checkbox must be checked before Save is enabled (test: Save button has `disabled` attribute when checkbox is unchecked)
- [ ] The consent notice text matches exactly what is specified above
- [ ] `ClaudePanel` shows "Connect Claude in Settings" when `api_key_set = false`
- [ ] Locked Premium buttons have `cursor-not-allowed` style and show tier badge
- [ ] `useClaudeStore` exists in `src/store/claudeStore.ts`
- [ ] Auto-summary runs only when `tier >= Standard` (not for Free tier users)
- [ ] The blinking cursor animation is present during streaming (check CSS)

---

### Step 2.5 — Processing history

**Cursor prompt:**
```
Implement the processing history feature.

In src-tauri/src/db/mod.rs, add a new table:
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    processed_at TEXT NOT NULL,    -- ISO 8601 timestamp
    page_count INTEGER NOT NULL,
    avg_confidence REAL,
    export_format TEXT,
    output_path TEXT,
    claude_tokens_used INTEGER DEFAULT 0,
    tier_at_time TEXT NOT NULL
  )

Add functions:
  pub fn insert_history_record(record: &HistoryRecord) -> Result<(), DbError>
  pub fn query_history(search: Option<&str>, limit: u32) -> Result<Vec<HistoryRecord>, DbError>
  pub fn delete_history_record(id: &str) -> Result<(), DbError>

Expose Tauri commands:
  get_history(search: Option<String>, limit: u32) -> Result<Vec<HistoryRecord>, String>
  delete_history(id: String) -> Result<(), String>

In useOcrProcessor.ts, after each document fully completes (OCR + optional Claude):
  call insert_history_record with the completed document data.

Build src/components/HistoryPanel.tsx (inside RightPanel's "History" tab):
- Search input at the top (calls get_history with the search string on change,
  debounced 300ms)
- List of history records showing: filename, processed date, page count,
  avg confidence, export format
- Each row has a "Re-export" button (re-triggers export with saved settings)
  and a trash icon (calls delete_history)
- Empty state: "No documents processed yet."
- The history list must be read-only — no editing of records
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] The `history` table is created on first launch (verify with `sqlite3 doculift.db .schema`)
- [ ] A history record is inserted after every completed document (verify by processing a test doc and querying the DB)
- [ ] `file_path` is stored but `content` is NOT stored (the PRD security requirement)
- [ ] Search is debounced (verify: the Tauri command is not called on every keystroke — check with network/IPC logging)
- [ ] Deleting a record removes it from the UI without a page reload
- [ ] `HistoryPanel` shows the empty state when no records exist

---

## Phase 3 — Private Beta (Weeks 10–11)

### Step 3.1 — Performance audit and background thread validation

**Cursor prompt:**
```
Audit and enforce the performance requirements from the PRD.

1. Verify OCR runs on a background thread and does not block the Tauri main thread.
   If it does, move it: use tokio::task::spawn_blocking for the synchronous
   leptess calls inside the async Tauri command.

2. Add a performance timing wrapper in src-tauri/src/ocr/mod.rs:
   log the wall-clock time for each page's OCR in debug builds only
   (use #[cfg(debug_assertions)]).

3. In src-tauri/src/main.rs, add startup timing:
   log the time from process start to first window shown in debug builds.

4. Add a Rust benchmark in benches/ocr_bench.rs using criterion:
   - Benchmark ocr_page() on tests/fixtures/sample_typed.png
   - The benchmark should print mean, median, and p95 times
   - Target: mean < 10s (the benchmark does not fail on this, just reports)

5. Add a memory check: in integration tests, use /proc/self/status (Linux/CI)
   or equivalent to assert RSS does not exceed 512MB during a full
   8-page document processing run.

6. Ensure the UI never freezes: verify that the DropZone and QueueSidebar
   remain interactive during OCR processing by adding a UI interaction test
   using Playwright (or Tauri's test utilities if available). The test should:
   - Start processing a document
   - While processing, drag a second file to the DropZone
   - Assert the second file is added to the queue without blocking
```

**Claude Code validation checklist:**
- [ ] `cargo bench` runs without errors
- [ ] `spawn_blocking` is used for all `leptess` calls (grep for `spawn_blocking` in `src-tauri/src/`)
- [ ] No `std::thread::sleep` or blocking calls on the Tauri async runtime thread
- [ ] Timing logs exist in `ocr/mod.rs` behind `#[cfg(debug_assertions)]`
- [ ] Memory assertion test exists and passes in CI
- [ ] The Playwright / UI interaction test exists in `tests/` and passes

---

### Step 3.2 — Error handling audit

**Cursor prompt:**
```
Audit every error handling path in the application.

1. In all Rust modules, replace any remaining unwrap() or expect() calls in
   non-test code with proper Result propagation or logged errors.
   Run: cargo clippy -- -D clippy::unwrap_used -D clippy::expect_used
   and fix all violations.

2. In every Tauri command, ensure errors are returned as descriptive String
   messages (not "internal error" or "unknown"). The frontend must be able
   to show the user what went wrong.

3. In the React frontend, audit every invoke() call:
   - Every invoke must have a .catch() or try/catch
   - Every caught error must update visible UI state (not just console.log)
   - No unhandled promise rejections

4. Add a global error boundary in src/App.tsx using React's ErrorBoundary.
   When triggered, show a fallback UI: "Something went wrong. Restart DocuLift."
   with a "Copy error details" button.

5. For the OCR pipeline specifically, add a recovery path:
   If a single page fails OCR (e.g. corrupted image after rasterization),
   continue processing remaining pages and mark that page as "error" in the
   results, with the page-level error message. Do not abort the entire document.

6. Add a test for the page-level recovery: create a corrupt test image in
   tests/fixtures/corrupt_page.png (a valid PNG header but corrupted body)
   and assert that processing a 3-page document where page 2 is corrupt returns
   results for pages 1 and 3, with page 2 marked as error.
```

**Claude Code validation checklist:**
- [ ] `cargo clippy -- -D clippy::unwrap_used -D clippy::expect_used` passes with zero violations in non-test code
- [ ] Every Tauri command returns descriptive error strings (audit manually: pick 5 commands and trigger their error paths)
- [ ] Every `invoke()` call in TypeScript has error handling (grep for `invoke(` and verify each one)
- [ ] No `console.error` is the only error handler anywhere
- [ ] The React ErrorBoundary exists in `App.tsx`
- [ ] The corrupt page test exists and passes
- [ ] Processing a document with one corrupt page does not crash the application

---

### Step 3.3 — Security audit

**Cursor prompt:**
```
Perform a security audit pass across the entire codebase.

1. Verify the local processing guarantee:
   This project uses Tauri v2, which replaced tauri.conf.json's `allowlist`
   section with a capabilities system in `src-tauri/capabilities/`.
   The existing `src-tauri/capabilities/default.json` grants only `core:default`.
   Verify that no network-related permissions (e.g. `http:default`) are present
   in any capability file. Add an integration test that attempts to open a TCP
   connection from within ocr_page() and asserts it fails (this tests that the
   Rust process is not granted unnecessary network access).

2. Verify Claude text-only transmission:
   Add a unit test for ClaudeClient that mocks the HTTP layer and asserts:
   - The request body contains only a "messages" array with text content
   - The request body does NOT contain any file paths
   - The request body does NOT contain any base64 data
   - The Content-Type header is "application/json"

3. Audit SQLite storage:
   Query the doculift.db after a full processing run and assert:
   - The `history` table contains no document text content
   - The `usage` table contains only numeric counts
   - The `settings` table does not contain the Claude API key

4. Verify minimum OS permissions:
   This project uses Tauri v2's capabilities system (not tauri.conf.json allowlist).
   Review all files in src-tauri/capabilities/ and assert:
   - No network/HTTP permissions are granted
   - Only the required fs scopes are present: $DOCUMENT/*, $TEMP/*, $APPDATA/*
   - No camera, microphone, location, or notification permissions are present
   - `shell:allow-open` is absent (it will be added only in Step 4.2)

5. API key in keychain:
   Add a test that calls save_claude_api_key(), then queries the SQLite DB,
   and asserts the key is NOT in the database.
```

**Claude Code validation checklist:**
- [ ] All 5 security tests exist and pass
- [ ] No capability file in `src-tauri/capabilities/` grants `http:default` or any network permission
- [ ] `src-tauri/capabilities/default.json` grants only `core:default` (or a minimal explicit set)
- [ ] The Claude API key is absent from every table in `doculift.db` after `save_claude_api_key()`
- [ ] `cargo audit` passes with no high-severity advisories (add `cargo-audit` to CI)
- [ ] No capability file grants `http:default` or any other network permission

---

## Phase 4 — Public Launch (Weeks 11–12)

### Step 4.1 — License key system

**Cursor prompt:**
```
Implement local license key validation in src-tauri/src/license/mod.rs.

The license key format: DLFT-XXXX-XXXX-XXXX-XXXX (where X is alphanumeric uppercase).
License keys encode the tier using a simple checksum scheme (not cryptographic —
this is a deterrent, not DRM):
- Keys starting with DLFT-S: Standard tier
- Keys starting with DLFT-P: Premium tier
- Keys starting with DLFT-W: White Glove tier
- The last 4 characters are a CRC32 checksum of the preceding characters

Implement:
  pub fn validate_license_key(key: &str) -> Result<Tier, LicenseError>
  pub fn activate_license(key: &str) -> Result<Tier, LicenseError>  // stores in DB
  pub fn get_active_license() -> Result<Option<(String, Tier)>, LicenseError>
  pub fn deactivate_license() -> Result<(), LicenseError>

Store the activated key and tier in the `settings` SQLite table (key = "license_key",
value = the key string; key = "tier", value = tier name).

Do NOT store any "activation server" concept — this is fully offline.

Build src/components/settings/LicenseSettings.tsx:
- License key input with the DLFT-XXXX-XXXX-XXXX-XXXX format mask
- Activate button
- Shows current tier and key (last 4 chars visible, rest masked: DLFT-S***-****-****-XXXX)
- Deactivate button with confirmation dialog
- The Free tier is always available with no license key

Add unit tests for validate_license_key covering:
- Valid Standard key
- Valid Premium key
- Key with invalid checksum
- Key with wrong format
- Empty string
```

**Claude Code validation checklist:**
- [ ] `cargo test` passes including all 5 license key unit tests
- [ ] `validate_license_key` correctly rejects keys with wrong checksums
- [ ] The license key is stored in SQLite (not the keychain — it is not a secret)
- [ ] The `tier` setting in SQLite is updated when a license is activated
- [ ] Deactivating a license sets tier back to "free" in SQLite
- [ ] The UI masks the key correctly (verify: only last 4 chars visible)
- [ ] Activating a license in the UI updates the tier badge in the TopBar without a restart

---

### Step 4.2 — Stripe payment integration (frontend only)

**Cursor prompt:**
```
Integrate Stripe Checkout for subscription management.

IMPORTANT: Stripe payment processing must happen in an external browser window,
never inside the Tauri webview. This project uses Tauri v2; opening URLs in
the system browser requires the `tauri-plugin-shell` plugin:

1. Add to src-tauri/Cargo.toml:
     tauri-plugin-shell = "2"
2. Register the plugin in lib.rs:
     .plugin(tauri_plugin_shell::init())
3. Add to src-tauri/capabilities/default.json permissions:
     "shell:allow-open"
4. In the Tauri command, open the URL via:
     app_handle.shell().open(url, None)?;

Do NOT use the removed `tauri::api::shell::open()` (Tauri v1 API).
Also add `@tauri-apps/plugin-shell` to package.json and use its `open()`
function in TypeScript if opening from the frontend instead.

Build src/components/settings/UpgradeScreen.tsx:
- Three plan cards: Standard ($9.99/mo), Premium ($19.99/mo), White Glove ($29.99/mo)
- Each card lists the tier's features from the PRD KPI table
- "Subscribe" button opens the Stripe Checkout URL in the system browser:
  Use placeholder URLs for now: https://buy.stripe.com/[placeholder-standard],
  https://buy.stripe.com/[placeholder-premium],
  https://buy.stripe.com/[placeholder-whiteglove]
- After the user subscribes externally, they receive a license key via email
  and enter it in LicenseSettings.tsx to activate their tier
- A notice on the screen: "After subscribing, you'll receive a license key by
  email within a few minutes. Enter it below to unlock your plan."
- "Already have a key?" link jumps to LicenseSettings.tsx

Add a Tauri command:
  open_upgrade_url(tier: String) -> Result<(), String>
  // validates tier is one of standard/premium/whiteglove, then opens the URL

The upgrade prompt should appear automatically when a user hits a tier limit:
- Page limit reached → show UpgradeScreen with the next tier highlighted
- Locked feature clicked → show UpgradeScreen with the unlocking tier highlighted
```

**Claude Code validation checklist:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Stripe URLs are opened via `tauri-plugin-shell`'s `app_handle.shell().open()` — NOT via `window.open()`, an iframe, or the removed Tauri v1 `tauri::api::shell::open()`
- [ ] `tauri-plugin-shell = "2"` is in `Cargo.toml` and the plugin is registered in `lib.rs`
- [ ] `"shell:allow-open"` is present in `src-tauri/capabilities/default.json`
- [ ] The Tauri command validates the `tier` parameter before opening any URL
- [ ] The upgrade screen appears when a page limit error is returned from `check_page_allowance`
- [ ] The upgrade screen appears when a locked format card is clicked
- [ ] No Stripe publishable key or secret key is present anywhere in the codebase (grep for `pk_` and `sk_`)

---

### Step 4.3 — Installer packaging

**Cursor prompt:**
```
Configure Tauri bundler to produce production installers.

In src-tauri/tauri.conf.json, configure:
- bundle.identifier: "com.doculift.app"
- bundle.icon: ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
  Generate placeholder icons using the `tauri icon` CLI command from a source SVG.
- bundle.macOS.minimumSystemVersion: "12.0"
- bundle.windows.wix: configure for .msi output
- bundle.resources: include the Tesseract language data files (eng.traineddata)
  at a path relative to the binary

Add a build script build.rs in src-tauri/ that:
1. Verifies Tesseract is installed on the build machine
2. Copies eng.traineddata to the resources directory if not already present
3. Sets the TESSERACT_DATA_PREFIX environment variable for leptess

Add to CI (.github/workflows/ci.yml):
- A separate "bundle" job that runs only on tags (v*)
- Builds the macOS .dmg on macos-latest runner
- Builds the Windows .msi on windows-latest runner
- Uploads both artifacts to the GitHub release

Document in docs/BUILD_PLAN.md (this file) the exact commands to produce
a production build locally:
  macOS: cargo tauri build
  Windows: cargo tauri build
```

**Claude Code validation checklist:**
- [ ] `cargo tauri build` completes without errors on macOS (run locally to verify)
- [ ] The `.dmg` contains the app bundle and the Tesseract language data
- [ ] `eng.traineddata` is accessible at runtime (verify by running the built app and processing a document)
- [ ] The bundle job in CI is triggered only by version tags, not every push
- [ ] `build.rs` exists in `src-tauri/`
- [ ] App icons are present in `src-tauri/icons/` (all four formats)

---

### Step 4.4 — Final integration test suite

**Cursor prompt:**
```
Write an end-to-end integration test suite in tests/integration/e2e_test.rs
that covers the complete happy path for each tier.

The test suite should:

Test 1 — Free tier happy path:
1. Set DB tier = "free"
2. Drop tests/fixtures/sample_typed.pdf (2 pages)
3. Assert OCR completes with avg_confidence > 0.8
4. Assert PDF export succeeds
5. Assert TXT export succeeds
6. Assert DOCX export returns TierRestricted error
7. Assert history record was inserted

Test 2 — Standard tier happy path:
1. Set DB tier = "standard"
2. Drop tests/fixtures/sample_typed.pdf
3. Assert OCR + Claude cleanup completes (mock Claude API with a stub)
4. Assert DOCX export succeeds
5. Assert batch of 3 files processes sequentially
6. Assert history records are inserted for all 3

Test 3 — Page limit enforcement:
1. Set DB tier = "free", usage pages_processed = 24
2. Drop tests/fixtures/sample_typed.pdf (2 pages)
3. Assert file is rejected with "Monthly page limit reached" error
4. Assert no history record was inserted
5. Assert pages_processed is still 24 (not incremented on failure)

Test 4 — Corrupt input recovery:
1. Drop a 3-page document where page 2 is tests/fixtures/corrupt_page.png
2. Assert pages 1 and 3 return OcrResult
3. Assert page 2 is marked as error
4. Assert the overall document status is 'done' (not 'error')

Test 5 — Security: no bytes leave the machine during OCR
1. Register a mock network interceptor
2. Run full OCR pipeline on sample_typed.pdf
3. Assert zero outbound network requests were made

All tests must pass in CI on both ubuntu-latest and (if budget allows) macos-latest.
```

**Claude Code validation checklist:**
- [ ] All 5 tests exist in `tests/integration/e2e_test.rs`
- [ ] All 5 tests pass with `cargo test`
- [ ] Tests 1–4 do not make real network requests (Claude API is mocked)
- [ ] Test 5 passes (zero outbound connections during OCR)
- [ ] Test 3 verifies pages_processed is NOT incremented on a rejected file
- [ ] All tests clean up their DB state (use a temp DB path per test, not the production DB)

---

## Completion criteria

Before tagging `v0.1.0-beta`:

- [ ] All steps above are marked complete by Claude Code validation
- [ ] `cargo test` passes with zero failures
- [ ] `cargo clippy -- -D warnings -D clippy::unwrap_used -D clippy::expect_used` passes
- [ ] `npm run build` passes with zero TypeScript errors and zero `any` types
- [ ] `cargo audit` passes with no high-severity advisories
- [ ] The app processes `tests/fixtures/sample_typed.pdf` end-to-end on a clean macOS install
- [ ] The app processes `tests/fixtures/sample_typed.pdf` end-to-end on a clean Windows install
- [ ] The trust pill is visible and accurate on all screens
- [ ] No document bytes are present in any network request (verified by Test 5)
- [ ] The `doculift.db` does not contain any document text content after a full run

---

## Local production build commands

```bash
# macOS
cargo tauri build

# Windows (run from Windows machine or cross-compile)
cargo tauri build

# Run tests
cargo test
cargo test --test e2e_test   # integration tests only

# Run benchmarks
cargo bench

# Lint
cargo clippy -- -D warnings -D clippy::unwrap_used -D clippy::expect_used
cargo fmt --check
npx tsc --noEmit
```

---

*DocuLift Build Plan v0.1 — Reference: docs/PRD.md — June 2026*
