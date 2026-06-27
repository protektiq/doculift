#![deny(unsafe_code)]

use crate::ocr::OcrResult;
use lopdf::{
    content::{Content, Operation},
    dictionary, Document, Object, ObjectId, Stream, StringFormat,
};
use std::{fmt, io, path::Path};

// ── Errors ────────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum ExportError {
    Io(io::Error),
    Pdf(String),
    InvalidInput(String),
}

impl fmt::Display for ExportError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExportError::Io(e) => write!(f, "I/O error: {e}"),
            ExportError::Pdf(msg) => write!(f, "PDF error: {msg}"),
            ExportError::InvalidInput(msg) => write!(f, "Invalid input: {msg}"),
        }
    }
}

impl From<io::Error> for ExportError {
    fn from(e: io::Error) -> Self {
        ExportError::Io(e)
    }
}

impl From<lopdf::Error> for ExportError {
    fn from(e: lopdf::Error) -> Self {
        ExportError::Pdf(e.to_string())
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Add an invisible text layer to each page of an existing PDF.
pub fn export_searchable_pdf(
    source_pdf_path: &str,
    ocr_results: &[OcrResult],
    output_path: &str,
) -> Result<(), ExportError> {
    if ocr_results.is_empty() {
        return Err(ExportError::InvalidInput("no OCR results provided".into()));
    }

    let mut doc = Document::load(source_pdf_path)?;
    let font_id = add_helvetica_font(&mut doc);
    let page_ids: Vec<ObjectId> = doc.page_iter().collect();

    for &page_id in &page_ids {
        add_font_to_page_resources(&mut doc, page_id, font_id)?;
    }

    for (idx, &page_id) in page_ids.iter().enumerate() {
        if let Some(result) = ocr_results.get(idx) {
            let stream = invisible_text_stream(&result.text)?;
            doc.add_page_contents(page_id, stream)?;
        }
    }

    doc.save(output_path)?;
    Ok(())
}

/// Create a new single-page PDF with an embedded image and invisible text overlay.
pub fn image_to_searchable_pdf(
    source_image_path: &str,
    ocr_result: &OcrResult,
    output_path: &str,
) -> Result<(), ExportError> {
    let img_path = Path::new(source_image_path);
    if !img_path.is_file() {
        return Err(ExportError::InvalidInput(format!(
            "image not found: {source_image_path}"
        )));
    }

    let mut doc = Document::with_version("1.5");

    // Page dimensions: US Letter in points
    const PW: i64 = 612;
    const PH: i64 = 792;

    let pages_id = doc.new_object_id();

    let font_id = add_helvetica_font(&mut doc);
    let img_id = doc.add_object(lopdf::xobject::image(img_path)?);

    let resources_id = doc.add_object(dictionary! {
        "Font" => dictionary! { "F1" => font_id },
        "XObject" => dictionary! { "Im0" => img_id },
    });

    let img_ops = vec![
        Operation::new("q", vec![]),
        Operation::new(
            "cm",
            vec![
                Object::Integer(PW),
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(PH),
                Object::Integer(0),
                Object::Integer(0),
            ],
        ),
        Operation::new("Do", vec![Object::Name(b"Im0".to_vec())]),
        Operation::new("Q", vec![]),
    ];
    let mut combined = Content { operations: img_ops }
        .encode()
        .map_err(|e| ExportError::Pdf(e.to_string()))?;
    combined.push(b'\n');
    combined.extend_from_slice(&invisible_text_stream(&ocr_result.text)?);

    let content_id = doc.add_object(Stream::new(dictionary! {}, combined));

    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "MediaBox" => vec![0_i64.into(), 0_i64.into(), PW.into(), PH.into()],
        "Resources" => resources_id,
        "Contents" => content_id,
    });

    doc.set_object(
        pages_id,
        dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1_i64,
        },
    );

    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);

    doc.save(output_path)?;
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn add_helvetica_font(doc: &mut Document) -> ObjectId {
    doc.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
    })
}

fn add_font_to_page_resources(
    doc: &mut Document,
    page_id: ObjectId,
    font_id: ObjectId,
) -> Result<(), ExportError> {
    let resources = doc
        .get_or_create_resources(page_id)
        .and_then(Object::as_dict_mut)
        .map_err(|e| ExportError::Pdf(e.to_string()))?;

    if resources.has(b"Font") {
        // Add F1 only if the existing Font entry is an inline Dictionary.
        // If it's an indirect reference, silently skip — the text stream is
        // still added; viewers that can't find F1 ignore invisible text.
        if let Ok(font_dict) = resources.get_mut(b"Font").and_then(Object::as_dict_mut) {
            font_dict.set("F1", Object::Reference(font_id));
        }
    } else {
        resources.set("Font", dictionary! { "F1" => Object::Reference(font_id) });
    }
    Ok(())
}

fn invisible_text_stream(text: &str) -> Result<Vec<u8>, ExportError> {
    // Keep only printable ASCII — Helvetica/WinAnsi can't render arbitrary bytes
    let safe: Vec<u8> = text
        .bytes()
        .filter(|&b| (0x20..=0x7E).contains(&b))
        .take(65_535)
        .collect();

    let ops = vec![
        Operation::new("q", vec![]),
        Operation::new("BT", vec![]),
        Operation::new("Tr", vec![Object::Integer(3)]),
        Operation::new(
            "Tf",
            vec![Object::Name(b"F1".to_vec()), Object::Integer(12)],
        ),
        Operation::new(
            "Td",
            vec![Object::Integer(0), Object::Integer(720)],
        ),
        Operation::new(
            "Tj",
            vec![Object::String(safe, StringFormat::Literal)],
        ),
        Operation::new("ET", vec![]),
        Operation::new("Q", vec![]),
    ];

    Content { operations: ops }
        .encode()
        .map_err(|e| ExportError::Pdf(e.to_string()))
}
