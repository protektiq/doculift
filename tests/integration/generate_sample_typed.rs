//! Generates `tests/fixtures/sample_typed.png` for OCR integration tests.
//!
//! Run from `src-tauri/`:
//!   cargo run --bin generate_sample_typed

use ab_glyph::FontRef;
use image::{ImageBuffer, Rgb, RgbImage};
use imageproc::drawing::draw_text_mut;
use std::path::PathBuf;

const FIXTURE_TEXT: &str = "DocuLift OCR test 1234";
const IMAGE_WIDTH: u32 = 1_200;
const IMAGE_HEIGHT: u32 = 300;
const FONT_SIZE: f32 = 56.0;

const FONT_PATHS: &[&str] = &[
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
];

fn main() {
    if let Err(error) = run() {
        eprintln!("failed to generate sample_typed.png: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let mut image: RgbImage =
        ImageBuffer::from_pixel(IMAGE_WIDTH, IMAGE_HEIGHT, Rgb([255, 255, 255]));

    let font_bytes = load_font_bytes()?;
    let font = FontRef::try_from_slice(&font_bytes)
        .map_err(|error| format!("font bytes are not a valid TTF: {error}"))?;

    draw_text_mut(
        &mut image,
        Rgb([0, 0, 0]),
        40,
        110,
        FONT_SIZE,
        &font,
        FIXTURE_TEXT,
    );

    let output = fixture_path();
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
    }

    image
        .save(&output)
        .map_err(|error| format!("failed to write {}: {error}", output.display()))?;

    println!("wrote {}", output.display());
    Ok(())
}

fn fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.png")
}

fn load_font_bytes() -> Result<Vec<u8>, String> {
    for path in FONT_PATHS {
        if let Ok(bytes) = std::fs::read(path) {
            return Ok(bytes);
        }
    }

    Err("no suitable TTF font found; install fonts-dejavu-core or fonts-liberation".to_string())
}
