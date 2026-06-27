import React from 'react';
import { DocViewer } from './DocViewer';
import { DropZone } from './DropZone';

interface CanvasProps {}

export const Canvas: React.FC<CanvasProps> = () => {
  return (
    <main className="flex-1 bg-[var(--paper)] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-[10px] bg-[var(--paper)] border-b border-[var(--paper-3)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-[var(--text-sub)]">Process</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-[6px] font-sans text-[12px] font-medium text-[var(--text-sub)] bg-white border border-[var(--paper-3)] rounded-[6px] px-[10px] py-[5px] cursor-pointer transition-all duration-[120ms] hover:bg-[var(--paper-2)] hover:text-[var(--text-main)]"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="5" />
              <line x1="7" y1="5" x2="7" y2="7" />
              <circle cx="7" cy="9" r="0.5" fill="currentColor" />
            </svg>
            OCR Settings
          </button>
          <button
            type="button"
            className="flex items-center gap-[6px] font-sans text-[12px] font-medium text-[var(--text-sub)] bg-white border border-[var(--paper-3)] rounded-[6px] px-[10px] py-[5px] cursor-pointer transition-all duration-[120ms] hover:bg-[var(--paper-2)] hover:text-[var(--text-main)]"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <rect x="2" y="2" width="10" height="10" rx="1" />
              <line x1="5" y1="5" x2="9" y2="5" />
              <line x1="5" y1="7" x2="9" y2="7" />
              <line x1="5" y1="9" x2="7" y2="9" />
            </svg>
            Preview Text
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        <DocViewer />
        <DropZone />
      </div>
    </main>
  );
};
