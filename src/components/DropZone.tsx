import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { FileQueueItem, FileExtension } from '../types/queue';
import { useQueueStore } from '../store/queueStore';

const ALLOWED: Set<string> = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif']);

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

interface DropZoneProps {
  onFilesAccepted?: (files: FileQueueItem[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesAccepted }) => {
  const addItems = useQueueStore((s) => s.addItems);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const [rejectionMsg, setRejectionMsg] = useState<string | null>(null);
  const rejectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRejection = useCallback((msg: string) => {
    setRejectionMsg(msg);
    if (rejectionTimer.current) clearTimeout(rejectionTimer.current);
    rejectionTimer.current = setTimeout(() => setRejectionMsg(null), 4000);
  }, []);

  const handleDrop = useCallback(
    (paths: string[]) => {
      const valid: FileQueueItem[] = [];
      const invalid: string[] = [];

      for (const p of paths) {
        const name = basename(p);
        const ext = getExt(name);
        if (ALLOWED.has(ext)) {
          valid.push({
            id: crypto.randomUUID(),
            name,
            path: p,
            size: 0,
            extension: ext as FileExtension,
            status: 'waiting',
          });
        } else {
          invalid.push(name);
        }
      }

      if (valid.length > 0) {
        addItems(valid);
        onFilesAccepted?.(valid);
      }

      if (invalid.length > 0) {
        const preview = invalid.slice(0, 2).join(', ');
        const more = invalid.length > 2 ? ` +${invalid.length - 2} more` : '';
        showRejection(`Unsupported: ${preview}${more} — only PDF, PNG, JPG, TIFF allowed`);
      }
    },
    [addItems, onFilesAccepted, showRejection]
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        unlisten = await getCurrentWindow().onDragDropEvent((event) => {
          const payload = event.payload;
          if (payload.type === 'enter') {
            setIsDragging(true);
            setDragCount(payload.paths.length);
          } else if (payload.type === 'leave') {
            setIsDragging(false);
            setDragCount(0);
          } else if (payload.type === 'drop') {
            setIsDragging(false);
            setDragCount(0);
            handleDrop(payload.paths);
          }
        });
      } catch {
        // Not running in Tauri context
      }
    })();

    return () => {
      unlisten?.();
      if (rejectionTimer.current) clearTimeout(rejectionTimer.current);
    };
  }, [handleDrop]);

  return (
    <div
      className={`border-2 border-dashed rounded-[10px] px-5 py-7 flex flex-col items-center justify-center gap-[10px] transition-all duration-200 cursor-pointer text-center flex-shrink-0 ${
        isDragging
          ? 'border-[var(--amber)] bg-[var(--amber-bg)]'
          : 'border-[var(--paper-3)] bg-white hover:border-[var(--amber)] hover:bg-[var(--amber-bg)]'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isDragging ? 'bg-[rgba(232,160,32,0.12)]' : 'bg-[var(--paper-2)]'
        }`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isDragging ? 'text-[var(--amber)]' : 'text-[var(--text-sub)]'}
        >
          <path d="M10 13V4M6 8l4-4 4 4" />
          <path d="M3 15h14a1 1 0 001-1v-1H2v1a1 1 0 001 1z" />
        </svg>
      </div>
      <div>
        {isDragging && dragCount > 0 ? (
          <p className="text-[14px] font-semibold text-[var(--amber)]">
            {dragCount} {dragCount === 1 ? 'file' : 'files'}
          </p>
        ) : (
          <p className="text-[14px] font-semibold text-[var(--text-main)]">Drop files here</p>
        )}
        <p className="font-mono text-[12px] text-[var(--text-sub)] mt-1">
          PDF · PNG · JPG · TIFF · up to 500 MB each
        </p>
      </div>
      {rejectionMsg !== null && (
        <p className="font-mono text-[11px] text-[var(--red)] max-w-[260px] leading-snug">
          {rejectionMsg}
        </p>
      )}
    </div>
  );
};
