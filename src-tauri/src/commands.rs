#![deny(unsafe_code)]

use crate::ocr::{self, OcrResult};
use std::path::{Path, PathBuf};

const ALLOWED_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "tiff", "tif"];
const PDF_EXTENSION: &str = "pdf";
const MAX_PATH_LEN: usize = 4_096;
const MAX_LANG_LEN: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FileKind {
    Image,
    Pdf,
}

/// Tauri IPC entry point for OCR processing.
#[tauri::command]
pub async fn process_file(path: String, lang: String) -> Result<Vec<OcrResult>, String> {
    let path = path.trim().to_string();
    let lang = lang.trim().to_string();

    tauri::async_runtime::spawn_blocking(move || process_file_sync(&path, &lang))
        .await
        .map_err(|error| format!("OCR task failed: {error}"))?
}

fn process_file_sync(path: &str, lang: &str) -> Result<Vec<OcrResult>, String> {
    validate_inputs(path, lang)?;
    let resolved_path = resolve_existing_path(path)?;
    let resolved_str = resolved_path
        .to_str()
        .ok_or_else(|| "File path is not valid UTF-8".to_string())?;

    match classify_extension(&resolved_path)? {
        FileKind::Image => {
            let result = ocr::ocr_page(resolved_str, lang).map_err(map_ocr_error)?;
            Ok(vec![result])
        }
        FileKind::Pdf => {
            let rasterized = ocr::pdf_to_images(resolved_str).map_err(map_pdf_error)?;
            let mut results = Vec::with_capacity(rasterized.as_slice().len());

            for page in rasterized.as_slice() {
                let result = ocr::ocr_page_with_number(&page.temp_image_path, lang, page.page_num)
                    .map_err(map_ocr_error)?;
                results.push(result);
            }

            Ok(results)
        }
    }
}

fn validate_inputs(path: &str, lang: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("File path must not be empty".to_string());
    }

    if path.len() > MAX_PATH_LEN {
        return Err("File path exceeds maximum allowed length".to_string());
    }

    if lang.is_empty() {
        return Err("Language code must not be empty".to_string());
    }

    if lang.len() > MAX_LANG_LEN {
        return Err("Language code exceeds maximum allowed length".to_string());
    }

    if !lang.chars().all(is_lang_char) {
        return Err("Language code contains invalid characters".to_string());
    }

    Ok(())
}

fn resolve_existing_path(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);

    if candidate.is_file() {
        return Ok(candidate);
    }

    if candidate.is_relative() {
        if let Ok(cwd) = std::env::current_dir() {
            let from_cwd = cwd.join(&candidate);
            if from_cwd.is_file() {
                return Ok(from_cwd);
            }
        }

        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let from_manifest = manifest_dir.join(&candidate);
        if from_manifest.is_file() {
            return Ok(from_manifest);
        }

        let from_project_root = manifest_dir.join("..").join(&candidate);
        if from_project_root.is_file() {
            return Ok(from_project_root);
        }
    }

    Err(format!("File not found: {path}"))
}

fn classify_extension(path: &Path) -> Result<FileKind, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "Missing or invalid file extension".to_string())?;

    if extension == PDF_EXTENSION {
        return Ok(FileKind::Pdf);
    }

    if ALLOWED_IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Ok(FileKind::Image);
    }

    Err(format!("Unsupported file extension: .{extension}"))
}

const fn is_lang_char(character: char) -> bool {
    character.is_ascii_alphanumeric() || character == '+' || character == '-'
}

fn map_ocr_error(error: ocr::OcrError) -> String {
    match error {
        ocr::OcrError::TesseractInit => "failed to initialize Tesseract".to_string(),
        ocr::OcrError::ImageLoad => "failed to load image".to_string(),
        ocr::OcrError::Utf8Error => "failed to decode OCR text as UTF-8".to_string(),
    }
}

fn map_pdf_error(error: ocr::PdfError) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::{classify_extension, process_file_sync, FileKind};
    use std::path::Path;

    #[test]
    fn rejects_unsupported_exe_extension() {
        let error = classify_extension(Path::new("malware.exe")).unwrap_err();
        assert_eq!(error, "Unsupported file extension: .exe");
    }

    #[test]
    fn rejects_unsupported_js_extension() {
        let error = classify_extension(Path::new("script.js")).unwrap_err();
        assert_eq!(error, "Unsupported file extension: .js");
    }

    #[test]
    fn accepts_pdf_extension() {
        assert_eq!(
            classify_extension(Path::new("document.pdf")).unwrap(),
            FileKind::Pdf
        );
    }

    #[test]
    fn accepts_png_extension() {
        assert_eq!(
            classify_extension(Path::new("scan.PNG")).unwrap(),
            FileKind::Image
        );
    }

    #[test]
    fn process_file_reads_fixture_image() {
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.png");
        let fixture_path = fixture.to_str().expect("fixture path must be valid UTF-8");

        let results = process_file_sync(fixture_path, "eng").expect("fixture OCR should succeed");
        assert_eq!(results.len(), 1);
        assert!(results[0].text.contains("DocuLift"));
        assert!(results[0].confidence > 0.7);
        assert_eq!(results[0].page_num, 1);
    }

    #[test]
    fn process_file_reads_fixture_pdf() {
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.pdf");
        assert!(
            fixture.is_file(),
            "missing fixture at {}; run `cargo run --bin generate_sample_typed_pdf` from src-tauri/",
            fixture.display()
        );

        let fixture_path = fixture.to_str().expect("fixture path must be valid UTF-8");

        let results =
            process_file_sync(fixture_path, "eng").expect("fixture PDF OCR should succeed");
        assert_eq!(results.len(), 2);
        assert!(results
            .iter()
            .all(|result| result.text.contains("DocuLift")));
        assert!(results.iter().all(|result| result.confidence > 0.7));
        assert_eq!(results[0].page_num, 1);
        assert_eq!(results[1].page_num, 2);
    }
}
