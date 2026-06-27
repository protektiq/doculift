import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FileQueueItem } from '../types/queue';
import { useQueueStore } from '../store/queueStore';

type ThumbStatus = 'done' | 'processing' | 'waiting';

const PageThumb: React.FC<{ num: number; status: ThumbStatus }> = ({ num, status }) => {
  const border =
    status === 'processing'
      ? 'border-[var(--amber)]'
      : 'border-[var(--paper-3)]';
  const bg =
    status === 'processing'
      ? 'bg-[var(--amber-bg)]'
      : status === 'done'
      ? 'bg-[var(--sage-bg)]'
      : 'bg-[var(--paper-2)]';
  const dot =
    status === 'processing'
      ? 'bg-[var(--amber)] animate-trust-pulse'
      : status === 'done'
      ? 'bg-[var(--sage)]'
      : 'bg-[var(--chrome-4)]';

  return (
    <div
      className={`rounded-[4px] border flex flex-col items-center justify-between px-2 py-2 min-h-[72px] ${border} ${bg}`}
    >
      <span className="font-mono text-[9px] text-[var(--text-sub)] self-start">{num}</span>
      <div className={`w-[6px] h-[6px] rounded-full ${dot}`} />
    </div>
  );
};

function buildPageStatuses(item: FileQueueItem): ThumbStatus[] {
  const total = item.pageCount ?? item.results?.length ?? 1;

  if (item.status === 'done' || item.status === 'error') {
    return Array.from<ThumbStatus>({ length: total }).fill('done');
  }

  const completedCount = Math.max(
    0,
    Math.round(((item.progress ?? 0) / 100) * total) - 1
  );

  return Array.from({ length: total }, (_, i) => {
    if (i < completedCount) return 'done' as ThumbStatus;
    if (i === completedCount) return 'processing' as ThumbStatus;
    return 'waiting' as ThumbStatus;
  });
}

function fileIconClasses(item: FileQueueItem): string {
  if (item.extension === 'pdf') return 'bg-[rgba(192,57,43,0.15)] text-[var(--red)]';
  if (item.extension === 'tiff' || item.extension === 'tif')
    return 'bg-[rgba(123,159,199,0.15)] text-[var(--blue-dim)]';
  return 'bg-[rgba(74,103,65,0.2)] text-[var(--sage)]';
}

function fileIconLabel(item: FileQueueItem): string {
  if (item.extension === 'jpeg') return 'JPG';
  return item.extension.toUpperCase();
}

interface DocViewerProps {}

export const DocViewer: React.FC<DocViewerProps> = () => {
  const items = useQueueStore((s) => s.items);
  const removeItem = useQueueStore((s) => s.removeItem);

  const item =
    items.find((i) => i.status === 'processing') ??
    items.find((i) => i.status === 'done') ??
    items.find((i) => i.status === 'error');

  if (!item) return null;

  const pageStatuses = buildPageStatuses(item);
  const totalPages = pageStatuses.length;
  const lastResult =
    item.results && item.results.length > 0
      ? item.results[item.results.length - 1]
      : null;

  const currentPageLabel =
    totalPages > 1
      ? `page ${Math.min(Math.ceil(((item.progress ?? 0) / 100) * totalPages), totalPages)} of ${totalPages}`
      : null;

  async function handleCancel() {
    if (!item) return;
    removeItem(item.id);
    try {
      await invoke('cancel_ocr', { id: item.id });
    } catch {
      // ignore — item already removed from store
    }
  }

  const progressPct = item.status === 'done' ? 100 : (item.progress ?? 0);
  const progressColor =
    item.status === 'done'
      ? 'bg-[var(--sage)]'
      : item.status === 'error'
      ? 'bg-[var(--red)]'
      : 'bg-[var(--amber)]';

  return (
    <div className="bg-white rounded-[10px] border border-[var(--paper-3)] overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-[10px] border-b border-[var(--paper-3)]">
        <div className="flex items-center gap-[8px] min-w-0">
          <div
            className={`w-[22px] h-[26px] rounded-[3px] flex items-center justify-center font-mono text-[6px] font-bold flex-shrink-0 ${fileIconClasses(item)}`}
          >
            {fileIconLabel(item)}
          </div>
          <span className="text-[13px] font-medium text-[var(--text-main)] truncate">
            {item.name}
          </span>
          {item.status === 'processing' && (
            <span className="font-mono text-[10px] text-[var(--amber)] flex-shrink-0">
              {progressPct}%
            </span>
          )}
          {item.status === 'done' && (
            <span className="font-mono text-[10px] text-[var(--sage)] flex-shrink-0">Done</span>
          )}
          {item.status === 'error' && (
            <span className="font-mono text-[10px] text-[var(--red)] flex-shrink-0">Error</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleCancel()}
          className="flex-shrink-0 font-sans text-[11px] font-medium text-[var(--text-sub)] bg-[var(--paper-2)] border border-[var(--paper-3)] rounded-[5px] px-[8px] py-[4px] cursor-pointer hover:bg-[var(--red-bg)] hover:text-[var(--red)] hover:border-[rgba(192,57,43,0.4)] transition-all duration-[120ms]"
        >
          {item.status === 'done' || item.status === 'error' ? 'Clear' : 'Cancel'}
        </button>
      </div>

      {/* Overall progress bar */}
      <div className="h-[3px] bg-[var(--paper-2)]">
        <div
          className={`h-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Body */}
      <div className="flex min-h-[300px] max-h-[380px]">
        {/* Page thumbnail strip */}
        <div className="w-20 border-r border-[var(--paper-3)] flex flex-col gap-1.5 p-2 overflow-y-auto flex-shrink-0 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--paper-3)] [&::-webkit-scrollbar-thumb]:rounded-[2px]">
          {pageStatuses.map((status, i) => (
            <PageThumb key={i} num={i + 1} status={status} />
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--paper-3)] [&::-webkit-scrollbar-thumb]:rounded-[2px]">
          {/* Processing state */}
          {item.status === 'processing' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[var(--amber)]">
                <svg
                  className="animate-ocr-spin flex-shrink-0"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.05 3.05l1.41 1.41M9.54 9.54l1.41 1.41M3.05 10.95l1.41-1.41M9.54 4.46l1.41-1.41" />
                </svg>
                <span className="font-mono text-[11px]">
                  {currentPageLabel
                    ? `Extracting text · ${currentPageLabel}…`
                    : 'Extracting text…'}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {[100, 85, 92, 70, 88].map((w, i) => (
                  <div
                    key={i}
                    className={`h-[9px] bg-[var(--paper-2)] rounded-full w-[${w}%]`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done state */}
          {item.status === 'done' && item.results && (
            <div className="flex flex-col gap-5">
              {lastResult && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-sub)] uppercase tracking-[0.6px] mb-2">
                    OCR Text · Page {lastResult.page_num}
                  </p>
                  <div className="bg-[var(--paper-2)] rounded-[6px] p-3 max-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--paper-3)] [&::-webkit-scrollbar-thumb]:rounded-[2px]">
                    <pre className="font-mono text-[11px] text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
                      {lastResult.text.trim() || '(no text found)'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Per-page confidence bars */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-sub)] uppercase tracking-[0.6px] mb-2">
                  Confidence
                </p>
                <div className="flex flex-col gap-[6px]">
                  {item.results.map((result) => (
                    <div key={result.page_num} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--text-sub)] w-[38px] flex-shrink-0">
                        p.{result.page_num}
                      </span>
                      <div className="flex-1 h-[5px] bg-[var(--paper-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--sage)] rounded-full"
                          style={{ width: `${result.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-dim)] w-[38px] text-right flex-shrink-0">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {item.status === 'error' && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold text-[var(--red)]">OCR failed</p>
              <p className="font-mono text-[11px] text-[var(--text-sub)] leading-relaxed">
                {item.error ?? 'An unexpected error occurred.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
