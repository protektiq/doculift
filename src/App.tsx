import { invoke } from "@tauri-apps/api/core";
import type { OcrResultList } from "./types/ocr";

const TEST_FIXTURE_PATH = "../tests/fixtures/sample_typed.png";
const TEST_PDF_FIXTURE_PATH = "../tests/fixtures/sample_typed.pdf";

const App = () => {
  const handleTestOcr = async () => {
    try {
      const results = await invoke<OcrResultList>("process_file", {
        path: TEST_FIXTURE_PATH,
        lang: "eng",
      });
      console.log("PNG OCR results:", results);
    } catch (error) {
      console.error("PNG OCR error:", error);
    }
  };

  const handleTestPdfOcr = async () => {
    try {
      const results = await invoke<OcrResultList>("process_file", {
        path: TEST_PDF_FIXTURE_PATH,
        lang: "eng",
      });
      console.log("PDF OCR results:", results);
    } catch (error) {
      console.error("PDF OCR error:", error);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <h1 className="p-8 font-sans text-2xl font-semibold">DocuLift</h1>
      <p className="px-8 font-mono text-sm text-neutral-400">
        Local-first document OCR
      </p>
      {/* TODO: remove in Step 1.1 */}
      <div className="mx-8 mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md bg-neutral-100 px-4 py-2 font-sans text-sm font-medium text-neutral-950 hover:bg-white"
          onClick={handleTestOcr}
          aria-label="Run temporary PNG OCR smoke test"
        >
          Test OCR — PNG (dev)
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-600 px-4 py-2 font-sans text-sm font-medium text-neutral-100 hover:border-neutral-400"
          onClick={handleTestPdfOcr}
          aria-label="Run temporary PDF OCR smoke test"
        >
          Test OCR — PDF (dev)
        </button>
      </div>
    </main>
  );
};

export default App;
