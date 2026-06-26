# DocuLift — Product Requirements Document

**Product:** DocuLift  
**Version:** 0.1 — MVP Draft  
**Status:** Draft for Review  
**Date:** June 2026  
**Author:** Product Team  
**Target Release:** Q4 2026

---

## 1. Background

### 1.1 Problem Statement

Millions of individuals and small businesses are drowning in paper documents, scanned PDFs, image-based files, and legacy Word documents they cannot search, edit, or extract data from. Converting these documents into usable digital formats today requires either expensive professional software or significant technical skill.

The two dominant incumbents are Adobe Acrobat and ABBYY FineReader. Both are expensive (Acrobat starts at $239/year), bloated with features most users never need, cloud-dependent, and slow to modernize their user experience. Open source alternatives like Tesseract exist but have no consumer GUI and require command-line proficiency.

The result: everyday users either pay too much, manually retype documents, or simply give up. This is a solvable problem.

### 1.2 Market Opportunity

The global OCR market was valued at over $13 billion in 2023 and is projected to grow significantly through 2030, driven by digitization mandates in healthcare, legal, and financial services. However, the consumer and small business segment is underserved by tools designed for enterprise procurement budgets.

The specific opportunity is a privacy-first, locally-run document digitization tool with a consumer-grade user experience priced at a fraction of Adobe Acrobat. No cloud upload required. No per-page fees. No enterprise contract.

### 1.3 Competitive Landscape

| Competitor | Price/Year | Local Processing | UX Quality | Primary Weakness |
|---|---|---|---|---|
| Adobe Acrobat | $239+ | No | Poor | Bloated, expensive, cloud-dependent |
| ABBYY FineReader | $199+ | Yes | Poor | Dated UI, slow updates, steep price |
| Tesseract (CLI) | Free | Yes | None (CLI) | No GUI, requires technical setup |
| **DocuLift (us)** | **$0–$29.99/mo** | **Yes** | **Consumer-grade** | **Target differentiator** |

---

## 2. User Personas

### Persona 1 — The Overwhelmed Small Business Owner

| | |
|---|---|
| **Name** | Maria, 44 — Owner of a 6-person accounting firm |
| **Pain** | Receives hundreds of paper receipts, contracts, and tax forms monthly. Manually scanning and organizing them costs her 4+ hours per week. |
| **Current Tool** | Adobe Acrobat (hates the price), sometimes emails documents to herself to use Google Drive OCR |
| **Goal** | Drag and drop a folder of scanned documents and get searchable, editable files back in under a minute |
| **Willingness to Pay** | Up to $19.99/month if it reliably saves her 3+ hours monthly |

### Persona 2 — The Graduate Student / Researcher

| | |
|---|---|
| **Name** | James, 28 — PhD candidate in history |
| **Pain** | Works with scanned archival documents and old academic papers. Cannot search them or copy text. Spends hours retyping quotes. |
| **Current Tool** | Tesseract via command line (technical enough to use it, but finds it painful) or Adobe free trial |
| **Goal** | Upload a scanned PDF and get clean, searchable text with accurate formatting preserved |
| **Willingness to Pay** | $9.99/month. Budget-constrained but would pay for a tool that works consistently |

### Persona 3 — The Privacy-Conscious Professional

| | |
|---|---|
| **Name** | Susan, 51 — Solo attorney |
| **Pain** | Needs to digitize client contracts and legal filings but cannot upload client documents to cloud services due to attorney-client privilege concerns. |
| **Current Tool** | ABBYY FineReader on an aging Windows machine. Rarely updated. Crashes on large files. |
| **Goal** | A local-only tool that processes documents on her machine with no cloud upload, ever |
| **Willingness to Pay** | $29.99/month without hesitation. Her billable rate makes this trivial. |

---

## 3. Vision & Objectives

### 3.1 Vision Statement

> DocuLift makes document digitization as simple as dragging a file onto a window. Every document you process stays on your machine. No cloud. No subscription to a tool built for enterprise. No technical knowledge required.

### 3.2 SMART Objectives for MVP

- Achieve a document-to-searchable-text conversion success rate of 90% or higher on standard typed documents within 60 days of private beta launch
- Onboard 500 free tier users within 30 days of public launch
- Convert 10% of free tier users to Standard ($9.99) within 90 days
- Achieve a Net Promoter Score (NPS) of 40 or higher at the end of the first quarter post-launch
- Process a single-page document end-to-end in under 10 seconds on a mid-range machine (2020 MacBook Pro or equivalent Windows hardware)

### 3.3 KPIs by Tier

| KPI | Free | Standard ($9.99/mo) | Premium ($19.99/mo) | White Glove ($29.99/mo) |
|---|---|---|---|---|
| Pages/month | 25 | 200 | Unlimited | Unlimited |
| Claude AI requests/month | 50 (Haiku) | 200 (Sonnet) | 500 (Sonnet) | Unlimited (Opus) |
| Output formats | PDF, TXT | PDF, TXT, DOCX | All formats | All formats |
| Batch processing | No | Up to 10 files | Unlimited batch | Unlimited batch |
| Priority support | No | No | Email 48hr | Email 24hr + chat |

---

## 4. Features

### 4.1 Feature Priority Legend

- **P0** — Must have for MVP launch. Blocking.
- **P1** — Should have. High impact. Target for v0.1 if schedule permits.
- **P2** — Nice to have. Deferred to v0.2+.

### 4.2 Core Feature Table

| Priority | Feature | Description | Min. Tier |
|---|---|---|---|
| P0 | Drag & Drop Ingestion | User drags one or more files (PDF, PNG, JPG, TIFF) onto the app window. App immediately shows a processing queue with file names and page counts. | Free |
| P0 | OCR Processing | Run Tesseract OCR (via leptess Rust bindings) against each page. Output clean text layer. Show live progress per page. | Free |
| P0 | PDF Output | Export result as a searchable PDF with embedded text layer. Preserve original visual layout. | Free |
| P0 | Plain Text Export | Export raw extracted text as .txt file. Clean whitespace normalization applied. | Free |
| P0 | Page Limit Enforcement | Enforce per-tier monthly page caps. Display remaining page count in UI. Prompt upgrade when limit is reached. | All tiers |
| P0 | Local Processing Guarantee | All OCR and document processing runs on-device. No document content leaves the machine. Verified by no network calls during processing. | All tiers |
| P1 | DOCX Export | Convert OCR output to a properly formatted .docx file using docx-rs Rust crate. Preserve paragraph structure and heading detection. | Standard |
| P1 | Batch Processing | Accept a folder drop. Queue all eligible files. Process sequentially with per-file status indicators. | Standard |
| P1 | Claude OCR Cleanup | After OCR, send extracted text to Claude API for cleanup: fix common OCR errors, normalize formatting, improve readability. Token usage tracked against tier limit. | Standard |
| P1 | Document Summary | Claude generates a 3–5 sentence plain-language summary of the document content. Displayed in sidebar after processing. | Standard |
| P1 | Processing History | Local SQLite log of all processed documents: filename, date, page count, output format, Claude tokens used. Searchable. | Standard |
| P2 | Table Extraction | Detect and extract tabular data from documents. Output as CSV or embed in DOCX as a formatted table. | Premium |
| P2 | Key Data Extraction | Claude identifies and extracts structured fields: dates, names, dollar amounts, addresses. Displayed in a sidebar panel. | Premium |
| P2 | Multi-language OCR | Support non-English Tesseract language packs. User selects document language before processing. | Premium |
| P2 | White Glove Dashboard | Usage dashboard showing monthly processing stats, token consumption, and document history export. | White Glove |

---

## 5. User Experience

### 5.1 Design Principles

- **Zero learning curve:** a user who has never seen the app should be able to process their first document in under 60 seconds without reading any documentation
- **Visible progress:** every operation shows real-time feedback. No spinners with no context.
- **Local-first trust signal:** a persistent indicator in the UI confirms that no internet connection is being used during processing
- **Graceful degradation:** if Claude API is unavailable, OCR processing continues without AI features. The user is informed, not blocked.

### 5.2 Core User Journey (MVP)

| Step | Action | System Response |
|---|---|---|
| 1 | User opens DocuLift | App launches in under 3 seconds. Landing area shows a large drop zone with clear instructions. |
| 2 | User drags a scanned PDF onto the drop zone | File is accepted. Page count detected. Processing queue appears with filename and estimated time. |
| 3 | Processing begins automatically | Per-page progress bar fills in real time. Current page number displayed. Cancel button available. |
| 4 | OCR completes | Document appears in results panel. Extracted text visible in preview. Confidence score shown per page. |
| 5 | Claude cleanup runs (if Standard+) | Text quality indicator updates. Summary appears in sidebar. Token usage updates in footer. |
| 6 | User selects export format | Dropdown with available formats for their tier. One-click export. File saved to user-selected location. |
| 7 | Export completes | Success toast notification. Option to open file or process another document. |

### 5.3 Out of Scope for MVP

- Mobile application (web browser or native iOS/Android)
- Cloud sync or cross-device document access
- Collaborative editing or document sharing
- Native integration with Google Drive, Dropbox, or OneDrive
- PDF form filling or digital signature support
- Real-time collaborative features

---

## 6. Technical Requirements

### 6.1 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Core Language | Rust (stable channel) | Primary implementation language across all layers |
| GUI Framework | Tauri v2 | Web-based frontend with Rust backend. Ships as native desktop app on macOS and Windows. |
| Frontend (UI) | React + TypeScript | Hosted inside Tauri webview. Tailwind CSS for styling. |
| OCR Engine | leptess (Rust crate) | Wraps Tesseract C++ library via FFI. Bundled with app. |
| Document Processing | lopdf, docx-rs | Pure Rust PDF and DOCX manipulation. No external runtime. |
| Local Database | SQLite via rusqlite | Stores processing history, usage stats, and tier state locally. |
| Claude Integration | reqwest + serde | Async HTTP calls to Anthropic API. Text-only payloads. No document bytes leave the machine. |
| Licensing & Auth | Local license key validation | License key stored locally. Periodic offline validation. No mandatory cloud check-in. |
| Packaging | Tauri bundler | Produces .dmg (macOS) and .msi (Windows) installers with bundled Tesseract language data. |

### 6.2 Security Requirements

- All document processing must occur in-process on the local machine. Zero document bytes transmitted to any external server.
- Claude API calls transmit extracted text only, never raw document files or images. Users must explicitly opt in to Claude features.
- The Rust core must compile with `#![deny(unsafe_code)]` enabled. Any FFI boundary (leptess/Tesseract) must be isolated in a dedicated crate with documented safety invariants.
- Local SQLite database must not store document content, only metadata (filename, page count, processing timestamp, token usage).
- License validation must function fully offline. No network call required to use the product after initial activation.
- App must request minimum OS permissions. No microphone, camera, contacts, or location access.
- Automatic updates must be user-initiated or user-confirmed. No silent background updates.

### 6.3 Performance Requirements

- Single-page OCR: complete in under 10 seconds on a 2020 MacBook Pro (M1) or equivalent x86 Windows machine
- App cold launch: under 3 seconds on the same reference hardware
- Memory ceiling: under 512MB RAM during single-document processing
- No perceptible UI freeze during OCR processing (processing runs on a background thread)

### 6.4 Platform Support for MVP

- macOS 12 (Monterey) and later — ARM and x86_64
- Windows 10 and Windows 11 — x86_64
- Linux: out of scope for MVP. Tauri supports it; defer to v0.2 based on demand.

---

## 7. Milestones & Timeline

| Phase | Timeline | Deliverables | Exit Criteria |
|---|---|---|---|
| Phase 0 — Foundation | Weeks 1–2 | Tauri + Rust project scaffold. leptess integration validated. Basic drag-and-drop file ingestion. CI pipeline. | Single-page OCR produces extractable text on test documents. |
| Phase 1 — Core MVP | Weeks 3–6 | Full OCR pipeline. PDF and TXT export. Page limit enforcement. Local SQLite history. Free tier fully functional. | Free tier user can process a document end-to-end without errors on macOS and Windows. |
| Phase 2 — Paid Features | Weeks 7–9 | DOCX export. Batch processing. Claude OCR cleanup integration. Document summary. Standard and Premium tier logic. | Standard tier user can batch-process 10 files with Claude cleanup and export to DOCX. |
| Phase 3 — Private Beta | Weeks 10–11 | 50-user private beta. Bug triage. Performance profiling on reference hardware. NPS survey. | 90% OCR success rate on beta test document set. No P0 crashes in 48-hour soak test. |
| Phase 4 — Public Launch | Week 12 | Public release. Payment integration (Stripe). License key system. Support documentation. Landing page. | 500 free tier signups within 30 days. Stripe subscription active for paid tiers. |

---

## 8. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Tesseract accuracy on low-quality scans is insufficient for user satisfaction | High | Set clear accuracy expectations in onboarding. Expose Tesseract confidence scores per page. Claude cleanup at Standard+ tier compensates for OCR errors. |
| leptess crate maintenance gaps create build failures on future Rust versions | Medium | Pin to a known-good leptess version. Budget time to fork and patch if upstream stalls. Evaluate alternative bindings (tesseract-rs) at Phase 1. |
| Claude API costs exceed revenue at Standard tier pricing | High | Model token costs per user before launch. Enforce hard monthly token caps per tier. Start with claude-haiku-4-5 for cleanup (cheaper) before offering Sonnet. |
| Tauri webview rendering inconsistencies between macOS and Windows | Medium | Test UI on both platforms every sprint. Use Tauri-native APIs over browser-specific APIs where possible. |
| Users attempt to process documents with sensitive PII and misunderstand what Claude receives | High | Require explicit user consent before any text is sent to Claude API. Display exactly what will be transmitted before sending. Provide a Claude-off mode. |
| Adobe or ABBYY significantly drops pricing in response to market pressure | Low | Our local-first, privacy angle is not easily replicated by cloud-dependent incumbents. Monitor pricing quarterly. |

---

## 9. Open Questions

- Should the MVP support handwritten document OCR? Tesseract accuracy on handwriting is poor. Recommend deferring to v0.2 with a dedicated handwriting model.
- What is the right free tier page limit to drive upgrades without frustrating users? Recommend A/B testing 10 vs. 25 pages/month in beta.
- Should the app store processed document metadata in iCloud or local-only? Recommend local-only for MVP to preserve the privacy positioning.
- Is a web app version (browser-based, no download) worth building? Conflicts with local-processing guarantee. Defer this decision until revenue validates the market.
- Which Stripe pricing model: monthly subscription, annual with discount, or lifetime license option? Recommend monthly + annual (20% discount) at launch. Evaluate lifetime license based on churn data after 6 months.

---

*DocuLift MVP PRD v0.1 — Confidential — June 2026*
