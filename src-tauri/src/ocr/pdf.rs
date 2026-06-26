#![deny(unsafe_code)]

use image::ImageFormat;
use pdfium_auto::bind_pdfium_silent;
use pdfium_render::prelude::*;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

/// Target rasterization resolution for PDF pages.
pub const RENDER_DPI: u32 = 300;
const PDF_POINTS_PER_INCH: f32 = 72.0;

/// A single PDF page rasterized to a temporary PNG file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RasterizedPage {
    pub page_num: u32,
    pub temp_image_path: String,
    pub width: u32,
    pub height: u32,
}

/// Rasterized PDF pages. Temporary PNG files are deleted when this value is dropped.
#[derive(Debug)]
pub struct RasterizedPages(Vec<RasterizedPage>);

impl RasterizedPages {
    pub fn as_slice(&self) -> &[RasterizedPage] {
        &self.0
    }
}

impl Drop for RasterizedPages {
    fn drop(&mut self) {
        for page in &self.0 {
            let _ = std::fs::remove_file(&page.temp_image_path);
        }
    }
}

/// Errors that can occur while rasterizing a PDF.
#[derive(Debug, Error)]
pub enum PdfError {
    #[error("pdf path must not be empty")]
    EmptyPath,
    #[error("pdf file not found: {0}")]
    NotFound(String),
    #[error("failed to initialize Pdfium: {0}")]
    PdfiumInit(String),
    #[error("failed to open pdf: {0}")]
    Open(String),
    #[error("failed to render page {page}: {message}")]
    Render { page: u32, message: String },
    #[error("pdf contains no pages")]
    EmptyDocument,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

/// Rasterize every page in a PDF to temporary PNG files at [`RENDER_DPI`].
pub fn pdf_to_images(pdf_path: &str) -> Result<RasterizedPages, PdfError> {
    if pdf_path.is_empty() {
        return Err(PdfError::EmptyPath);
    }

    let path = Path::new(pdf_path);
    if !path.is_file() {
        return Err(PdfError::NotFound(pdf_path.to_string()));
    }

    let pdfium = bind_pdfium_silent().map_err(|error| PdfError::PdfiumInit(error.to_string()))?;

    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|error| PdfError::Open(error.to_string()))?;

    let render_scale = RENDER_DPI as f32 / PDF_POINTS_PER_INCH;
    let render_config = PdfRenderConfig::new().scale_page_by_factor(render_scale);

    let temp_dir = std::env::temp_dir().join("doculift");
    std::fs::create_dir_all(&temp_dir)?;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    let mut pages = Vec::new();

    for (index, page) in document.pages().iter().enumerate() {
        let page_num = index as u32 + 1;
        let bitmap = page
            .render_with_config(&render_config)
            .map_err(|error| PdfError::Render {
                page: page_num,
                message: error.to_string(),
            })?;

        let image = bitmap.as_image();

        let width = image.width();
        let height = image.height();
        let temp_path = temp_dir.join(format!("doculift_{stamp}_p{page_num}.png"));

        image
            .save_with_format(&temp_path, ImageFormat::Png)
            .map_err(|error| PdfError::Render {
                page: page_num,
                message: error.to_string(),
            })?;

        pages.push(RasterizedPage {
            page_num,
            temp_image_path: temp_path
                .to_str()
                .ok_or_else(|| PdfError::Render {
                    page: page_num,
                    message: "temporary path is not valid UTF-8".to_string(),
                })?
                .to_string(),
            width,
            height,
        });
    }

    if pages.is_empty() {
        return Err(PdfError::EmptyDocument);
    }

    Ok(RasterizedPages(pages))
}

#[cfg(test)]
mod tests {
    use super::{pdf_to_images, RENDER_DPI};
    use pdfium_render::prelude::PdfRenderConfig;
    use std::path::PathBuf;

    fn fixture_pdf() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.pdf")
    }

    #[test]
    fn render_config_uses_300_dpi_scale() {
        let scale = RENDER_DPI as f32 / 72.0;
        let _config = PdfRenderConfig::new().scale_page_by_factor(scale);
        assert_eq!(RENDER_DPI, 300);
        assert!((scale - 4.1666665).abs() < 0.001);
    }

    #[test]
    fn pdf_to_images_produces_two_pages() {
        let pdf_path = fixture_pdf();
        assert!(
            pdf_path.is_file(),
            "missing fixture at {}; run `cargo run --bin generate_sample_typed_pdf` from src-tauri/",
            pdf_path.display()
        );

        let path_str = pdf_path.to_str().expect("fixture path must be valid UTF-8");
        let pages = pdf_to_images(path_str).expect("pdf_to_images should succeed");
        assert_eq!(pages.as_slice().len(), 2);
        assert_eq!(pages.as_slice()[0].page_num, 1);
        assert_eq!(pages.as_slice()[1].page_num, 2);
    }

    #[test]
    fn temp_png_files_are_removed_on_drop() {
        let pdf_path = fixture_pdf();
        assert!(
            pdf_path.is_file(),
            "missing fixture at {}; run `cargo run --bin generate_sample_typed_pdf` from src-tauri/",
            pdf_path.display()
        );
        let path_str = pdf_path.to_str().expect("fixture path must be valid UTF-8");

        let temp_paths: Vec<PathBuf> = {
            let pages = pdf_to_images(path_str).expect("pdf_to_images should succeed");
            let paths: Vec<PathBuf> = pages
                .as_slice()
                .iter()
                .map(|page| PathBuf::from(&page.temp_image_path))
                .collect();

            for path in &paths {
                assert!(
                    path.exists(),
                    "expected temp png to exist before drop: {}",
                    path.display()
                );
            }

            paths
        };

        for path in temp_paths {
            assert!(
                !path.exists(),
                "expected temp png to be deleted after drop: {}",
                path.display()
            );
        }
    }
}
