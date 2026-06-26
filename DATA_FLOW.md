# DocuLift — Data Flow Diagram

**Last updated:** Step 0.5 (CI pipeline)

```mermaid
flowchart TB
    subgraph Frontend["React + TypeScript (src/)"]
        UI[App / Components]
        Store[Zustand Store]
        Hooks[Custom Hooks]
        Types[TypeScript Types]
    end

    subgraph TauriBridge["Tauri IPC Bridge"]
        Invoke[invoke commands]
    end

    subgraph Backend["Rust Backend (src-tauri/)"]
        Main[main.rs / lib.rs]
        OCR[ocr/]
        Export[export/]
        DB[db/]
        Claude[claude/]
        Tier[tier/]
        License[license/]
    end

    subgraph External["External Services"]
        ClaudeAPI[Claude API]
        FS[Local Filesystem]
        SQLite[(SQLite DB)]
    end

    UI --> Hooks
    UI --> Store
    Hooks --> Types
    Store --> Types
    UI --> Invoke
    Invoke --> Main
    Main --> OCR
    Main --> Export
    Main --> DB
    Main --> Claude
    Main --> Tier
    Main --> License
    OCR --> FS
    Export --> FS
    DB --> SQLite
    Claude --> ClaudeAPI
    License --> FS
```

## Phase 0.5 status

GitHub Actions CI (`.github/workflows/ci.yml`) runs on every push and pull request to `main`: Rust fmt/clippy/tests, then frontend `npm ci`, Vite build, and `tsc --noEmit`. Cargo and npm caches are configured to speed up repeat runs.
