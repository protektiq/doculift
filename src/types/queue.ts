import type { OcrResult } from './ocr';

export type FileExtension = 'pdf' | 'png' | 'jpg' | 'jpeg' | 'tiff' | 'tif';

export interface FileQueueItem {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: FileExtension;
  status: 'waiting' | 'processing' | 'done' | 'error';
  pageCount?: number;
  progress?: number;
  error?: string;
  results?: OcrResult[];
}
