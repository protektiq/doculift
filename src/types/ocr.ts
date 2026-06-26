/** OCR output for a single page — mirrors `doculift_lib::ocr::OcrResult`. */
export interface OcrResult {
  text: string;
  confidence: number;
  page_num: number;
}

/** `process_file` returns one result per page (images return a single-item array). */
export type OcrResultList = OcrResult[];

/** OCR failure variants — mirrors `doculift_lib::ocr::OcrError`. */
export type OcrErrorVariant = "TesseractInit" | "ImageLoad" | "Utf8Error";

export interface OcrError {
  variant: OcrErrorVariant;
  message: string;
}
