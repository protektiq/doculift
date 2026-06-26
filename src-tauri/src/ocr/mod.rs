#![deny(unsafe_code)]

//! OCR pipeline module.

mod ffi;
mod pdf;

pub use pdf::{pdf_to_images, PdfError, RasterizedPage, RasterizedPages};

use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

/// OCR output for a single page.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OcrResult {
    pub text: String,
    pub confidence: f32,
    pub page_num: u32,
}

/// Errors that can occur while running OCR on a page.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum OcrError {
    #[error("failed to initialize Tesseract")]
    TesseractInit,
    #[error("failed to load image")]
    ImageLoad,
    #[error("failed to decode OCR text as UTF-8")]
    Utf8Error,
}

/// Run OCR on a single image file.
///
/// `image_path` must point to an existing readable image file. `lang` must be a valid
/// Tesseract language code (e.g. `"eng"`).
pub fn ocr_page(image_path: &str, lang: &str) -> Result<OcrResult, OcrError> {
    ocr_page_with_number(image_path, lang, 1)
}

/// Run OCR on a single image file, assigning a specific page number.
pub fn ocr_page_with_number(
    image_path: &str,
    lang: &str,
    page_num: u32,
) -> Result<OcrResult, OcrError> {
    if page_num == 0 {
        return Err(OcrError::ImageLoad);
    }

    let path = Path::new(image_path);

    if image_path.is_empty() {
        return Err(OcrError::ImageLoad);
    }

    if lang.is_empty() || lang.len() > 32 || !lang.chars().all(is_lang_char) {
        return Err(OcrError::TesseractInit);
    }

    if !path.is_file() {
        return Err(OcrError::ImageLoad);
    }

    let output = ffi::run_ocr(path, lang).map_err(map_ffi_error)?;

    Ok(OcrResult {
        text: output.text,
        confidence: output.confidence,
        page_num,
    })
}

const fn is_lang_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || ch == '+' || ch == '-'
}

const fn map_ffi_error(error: ffi::FfiOcrError) -> OcrError {
    match error {
        ffi::FfiOcrError::TesseractInit => OcrError::TesseractInit,
        ffi::FfiOcrError::ImageLoad => OcrError::ImageLoad,
        ffi::FfiOcrError::Utf8Error => OcrError::Utf8Error,
    }
}

#[cfg(test)]
mod tests {
    use super::{ocr_page, OcrError};

    #[test]
    fn rejects_empty_image_path() {
        let result = ocr_page("", "eng");
        assert_eq!(result, Err(OcrError::ImageLoad));
    }

    #[test]
    fn rejects_missing_file() {
        let result = ocr_page("tests/fixtures/does_not_exist.png", "eng");
        assert_eq!(result, Err(OcrError::ImageLoad));
    }

    #[test]
    fn rejects_invalid_language_code() {
        let result = ocr_page("tests/fixtures/sample_typed.png", "");
        assert_eq!(result, Err(OcrError::TesseractInit));
    }
}
