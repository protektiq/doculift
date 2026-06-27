import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useQueueStore } from '../store/queueStore';
import type { OcrResult } from '../types/ocr';

interface ProgressPayload {
  id: string;
  page: number;
  total: number;
  confidence: number;
}

export function useOcrProcessor(): void {
  const isProcessing = useRef(false);

  useEffect(() => {
    async function processNext(): Promise<void> {
      if (isProcessing.current) return;

      const { items } = useQueueStore.getState();
      const item = items.find((i) => i.status === 'waiting');
      if (!item) return;

      isProcessing.current = true;
      useQueueStore.getState().updateItem(item.id, { status: 'processing', progress: 0 });

      let unlisten: (() => void) | undefined;

      try {
        unlisten = await listen<ProgressPayload>('ocr:progress', (event) => {
          const { payload } = event;
          if (payload.id !== item.id) return;
          const progress = Math.round((payload.page / payload.total) * 100);
          console.log(
            `[OCR] ${item.name} page ${payload.page}/${payload.total}` +
              ` (${(payload.confidence * 100).toFixed(1)}% confidence)`
          );
          useQueueStore.getState().updateItem(item.id, {
            progress,
            pageCount: payload.total,
          });
        });

        const results = await invoke<OcrResult[]>('process_file', {
          id: item.id,
          path: item.path,
          lang: 'eng',
        });

        useQueueStore.getState().updateItem(item.id, {
          status: 'done',
          progress: 100,
          results,
          pageCount: results.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        useQueueStore.getState().updateItem(item.id, { status: 'error', error: message });
      } finally {
        unlisten?.();
        isProcessing.current = false;
      }
    }

    const unsubscribe = useQueueStore.subscribe((state) => {
      const hasWaiting = state.items.some((i) => i.status === 'waiting');
      if (hasWaiting && !isProcessing.current) {
        void processNext();
      }
    });

    void processNext();

    return unsubscribe;
  }, []);
}
