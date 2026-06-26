use doculift_lib::ocr::ocr_page;
use std::path::PathBuf;

fn fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.png")
}

#[test]
fn ocr_page_reads_sample_typed_png() {
    let path = fixture_path();
    assert!(
        path.is_file(),
        "missing fixture at {}; run `cargo run --bin generate_sample_typed` from src-tauri/",
        path.display()
    );

    let path_str = path.to_str().expect("fixture path must be valid UTF-8");

    let result = ocr_page(path_str, "eng").expect("ocr_page should succeed on sample_typed.png");

    assert!(
        result.text.contains("DocuLift"),
        "expected OCR text to contain 'DocuLift', got: {:?}",
        result.text
    );
    assert!(
        result.confidence > 0.7,
        "expected confidence > 0.7, got {}",
        result.confidence
    );
    assert_eq!(result.page_num, 1);
}
