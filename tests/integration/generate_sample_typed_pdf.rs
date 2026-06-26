//! Generates `tests/fixtures/sample_typed.pdf` — a 2-page PDF from `sample_typed.png`.

use image::GenericImageView;
use lopdf::content::{Content, Operation};
use lopdf::xobject;
use lopdf::{dictionary, Document, Object, Stream};
use std::path::PathBuf;

fn main() {
    if let Err(error) = run() {
        eprintln!("failed to generate sample_typed.pdf: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let png_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.png");
    let pdf_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/sample_typed.pdf");

    if !png_path.is_file() {
        return Err(format!(
            "missing source png at {}; run `cargo run --bin generate_sample_typed` first",
            png_path.display()
        ));
    }

    let image = image::open(&png_path).map_err(|error| format!("failed to open png: {error}"))?;
    let (width, height) = image.dimensions();

    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let mut page_ids = Vec::new();

    for _ in 0..2 {
        let image_stream = xobject::image(&png_path)
            .map_err(|error| format!("failed to read png for embedding: {error}"))?;

        let image_id = doc.add_object(image_stream);
        let image_name = format!("X{}", image_id.0);

        let content = Content {
            operations: vec![
                Operation::new(
                    "cm",
                    vec![
                        width.into(),
                        0.into(),
                        0.into(),
                        height.into(),
                        0.into(),
                        0.into(),
                    ],
                ),
                Operation::new("Do", vec![Object::Name(image_name.as_bytes().to_vec())]),
            ],
        };

        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            content.encode().map_err(|error| error.to_string())?,
        ));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), width.into(), height.into()],
        });

        doc.add_xobject(page_id, image_name.as_bytes(), image_id)
            .map_err(|error| format!("failed to attach image xobject: {error}"))?;

        page_ids.push(page_id);
    }

    let pages_dict = dictionary! {
        "Type" => "Pages",
        "Count" => page_ids.len() as u32,
        "Kids" => page_ids.into_iter().map(Object::Reference).collect::<Vec<_>>(),
    };
    doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);
    doc.compress();

    if let Some(parent) = pdf_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
    }

    doc.save(&pdf_path)
        .map_err(|error| format!("failed to write {}: {error}", pdf_path.display()))?;

    println!("wrote {}", pdf_path.display());
    Ok(())
}
