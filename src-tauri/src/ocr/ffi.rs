//! FFI boundary for Tesseract OCR via [leptess].
//!
//! # Safety invariants
//!
//! - All calls into Tesseract and Leptonica are confined to this module so the rest of the
//!   crate stays `#![deny(unsafe_code)]`.
//! - `LepTess` instances are created, used, and dropped on the calling thread only.
//! - `image_path` must reference an existing, readable file before `set_image` is invoked.
//! - Language codes passed to Tesseract must be valid installed tessdata identifiers (e.g. `eng`).
//! - UTF-8 text returned from Tesseract is validated before crossing back into safe Rust.
//!
//! Leptess wraps the underlying C API; this module is the single integration point for that FFI.

#![allow(unsafe_code)]

use leptess::LepTess;
use std::path::Path;

/// Raw OCR output from the Tesseract FFI boundary.
pub struct FfiOcrOutput {
    pub text: String,
    /// Mean word confidence normalized to 0.0–1.0.
    pub confidence: f32,
}

/// Errors raised while crossing the Tesseract FFI boundary.
#[derive(Debug)]
pub enum FfiOcrError {
    TesseractInit,
    ImageLoad,
    Utf8Error,
}

/// Run full-page OCR on an image file using Tesseract.
pub fn run_ocr(image_path: &Path, lang: &str) -> Result<FfiOcrOutput, FfiOcrError> {
    let mut tess = LepTess::new(None, lang).map_err(|_| FfiOcrError::TesseractInit)?;

    tess.set_image(image_path)
        .map_err(|_| FfiOcrError::ImageLoad)?;

    let text = tess.get_utf8_text().map_err(|_| FfiOcrError::Utf8Error)?;

    let confidence = normalize_confidence(tess.mean_text_conf());

    Ok(FfiOcrOutput { text, confidence })
}

const fn normalize_confidence(raw: i32) -> f32 {
    let clamped = if raw < 0 {
        0
    } else if raw > 100 {
        100
    } else {
        raw
    };
    clamped as f32 / 100.0
}

#[cfg(test)]
mod tests {
    use super::normalize_confidence;

    #[test]
    fn normalize_confidence_maps_tesseract_range() {
        assert!((normalize_confidence(0) - 0.0).abs() < f32::EPSILON);
        assert!((normalize_confidence(100) - 1.0).abs() < f32::EPSILON);
        assert!((normalize_confidence(85) - 0.85).abs() < f32::EPSILON);
    }

    #[test]
    fn normalize_confidence_clamps_out_of_range() {
        assert!((normalize_confidence(-10) - 0.0).abs() < f32::EPSILON);
        assert!((normalize_confidence(150) - 1.0).abs() < f32::EPSILON);
    }
}
