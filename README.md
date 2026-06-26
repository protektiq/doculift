# DocuLift

Local-first document OCR desktop app built with Tauri v2, React, TypeScript, and Rust.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)

### Linux (WSL/Ubuntu)

```bash
sudo apt update
sudo apt install \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libleptonica-dev libtesseract-dev tesseract-ocr-eng clang \
  fonts-dejavu-core
```

**PDF rasterization (Step 0.4+):** On first run, `pdfium-auto` downloads `libpdfium` to `~/.cache/pdf2md/`. If PDF tests crash with `SIGBUS`, delete that cache folder and re-run `cargo test` to force a fresh download.

```bash
rm -rf ~/.cache/pdf2md/pdfium-7690
```

- [Tauri prerequisites](https://tauri.app/start/prerequisites/#linux)
- [leptess / Tesseract](https://github.com/houqp/leptess) for OCR (Step 0.2+)

## Development

```bash
npm install
npm run tauri dev    # launches the DocuLift window (1400×900)
npm run dev          # Vite frontend only (no Tauri shell)
```

## Build & test

```bash
npm run build                 # frontend production build
cd src-tauri && cargo build   # Rust / Tauri backend
cd src-tauri && cargo test    # OCR integration tests (needs Tesseract)
```

Regenerate OCR smoke-test fixtures:

```bash
cd src-tauri && cargo run --bin generate_sample_typed
cd src-tauri && cargo run --bin generate_sample_typed_pdf
```

## Project layout

See `docs/BUILD_PLAN.md` for the full build sequence and `DATA_FLOW.md` for the architecture diagram.
