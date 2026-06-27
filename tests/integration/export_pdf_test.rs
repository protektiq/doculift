use doculift_lib::{
    export::pdf::{export_searchable_pdf, image_to_searchable_pdf},
    ocr::OcrResult,
};
use lopdf::Document;
use std::path::PathBuf;

fn fixture_pdf() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.pdf")
}

fn fixture_png() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.png")
}

fn make_results() -> Vec<OcrResult> {
    vec![
        OcrResult { text: "DocuLift page one".into(), confidence: 0.95, page_num: 1 },
        OcrResult { text: "DocuLift page two".into(), confidence: 0.92, page_num: 2 },
    ]
}

#[test]
fn export_searchable_pdf_embeds_text_layer() {
    let source = fixture_pdf();
    assert!(
        source.is_file(),
        "missing fixture at {}; run `cargo run --bin generate_sample_typed_pdf` from src-tauri/",
        source.display()
    );

    let out_dir = std::env::temp_dir();
    let out_path = out_dir.join("doculift_export_test.pdf");
    let out_str = out_path.to_str().expect("output path must be valid UTF-8");

    let source_str = source.to_str().expect("fixture path must be valid UTF-8");
    let results = make_results();

    export_searchable_pdf(source_str, &results, out_str)
        .expect("export_searchable_pdf should succeed");

    assert!(out_path.is_file(), "exported PDF was not written to disk");

    // Re-open the exported PDF and verify that the invisible text content was appended.
    let doc = Document::load(&out_path).expect("exported PDF must be loadable by lopdf");
    let page_ids: Vec<_> = doc.page_iter().collect();
    assert_eq!(page_ids.len(), 2, "exported PDF must retain two pages");

    // Read raw content bytes for each page and assert OCR text is present.
    for (i, &page_id) in page_ids.iter().enumerate() {
        let content = doc
            .get_page_content(page_id)
            .expect("page content must be readable");
        let content_str = String::from_utf8_lossy(&content);
        assert!(
            content_str.contains("DocuLift"),
            "page {} content should contain 'DocuLift', got: {:.200}",
            i + 1,
            content_str
        );
    }

    let _ = std::fs::remove_file(&out_path);
}

#[test]
fn image_to_searchable_pdf_creates_valid_pdf() {
    let source = fixture_png();
    assert!(source.is_file(), "missing fixture sample_typed.png");

    let out_path = std::env::temp_dir().join("doculift_image_export_test.pdf");
    let out_str = out_path.to_str().expect("output path must be valid UTF-8");
    let source_str = source.to_str().expect("fixture path must be valid UTF-8");

    let result = OcrResult {
        text: "DocuLift single page".into(),
        confidence: 0.90,
        page_num: 1,
    };

    image_to_searchable_pdf(source_str, &result, out_str)
        .expect("image_to_searchable_pdf should succeed");

    assert!(out_path.is_file(), "exported PDF was not written to disk");

    let doc = Document::load(&out_path).expect("created PDF must be loadable");
    let page_ids: Vec<_> = doc.page_iter().collect();
    assert_eq!(page_ids.len(), 1, "image PDF should have exactly one page");

    let content = doc
        .get_page_content(page_ids[0])
        .expect("page content must be readable");
    let content_str = String::from_utf8_lossy(&content);
    assert!(
        content_str.contains("DocuLift"),
        "page content should contain 'DocuLift', got: {:.200}",
        content_str
    );

    let _ = std::fs::remove_file(&out_path);
}

#[test]
fn export_searchable_pdf_rejects_empty_results() {
    let source = fixture_pdf();
    assert!(source.is_file(), "missing fixture");

    let source_str = source.to_str().unwrap();
    let result = export_searchable_pdf(source_str, &[], "/tmp/should_not_be_created.pdf");

    assert!(result.is_err(), "should reject empty results");
    let msg = result.unwrap_err().to_string();
    assert!(msg.contains("no OCR results"), "error should mention results: {msg}");
}
