use doculift_lib::ocr::{ocr_page_with_number, pdf_to_images};
use std::path::PathBuf;

fn fixture_pdf() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.pdf")
}

#[test]
fn pdf_to_images_returns_two_rasterized_pages() {
    let path = fixture_pdf();
    assert!(
        path.is_file(),
        "missing fixture at {}; run `cargo run --bin generate_sample_typed_pdf` from src-tauri/",
        path.display()
    );

    let path_str = path.to_str().expect("fixture path must be valid UTF-8");
    let pages = pdf_to_images(path_str).expect("pdf_to_images should succeed on sample_typed.pdf");

    assert_eq!(pages.as_slice().len(), 2);
    assert_eq!(pages.as_slice()[0].page_num, 1);
    assert_eq!(pages.as_slice()[1].page_num, 2);
    assert!(pages.as_slice()[0].width > 0);
    assert!(pages.as_slice()[0].height > 0);
}

#[test]
fn pdf_fixture_ocr_returns_two_results() {
    let path = fixture_pdf();
    let path_str = path.to_str().expect("fixture path must be valid UTF-8");

    let rasterized = pdf_to_images(path_str).expect("pdf_to_images should succeed");
    let mut results = Vec::new();

    for page in rasterized.as_slice() {
        let result = ocr_page_with_number(&page.temp_image_path, "eng", page.page_num)
            .expect("ocr_page_with_number should succeed on rasterized page");
        results.push(result);
    }

    assert_eq!(results.len(), 2);
    assert!(results
        .iter()
        .all(|result| result.text.contains("DocuLift")));
    assert!(results.iter().all(|result| result.confidence > 0.7));
}
