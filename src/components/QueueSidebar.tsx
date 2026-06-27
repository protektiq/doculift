import React from 'react';
import { useQueueStore } from '../store/queueStore';
import type { FileQueueItem, FileExtension } from '../types/queue';

type IconConfig = { bg: string; text: string; label: string };

const FILE_ICON: Record<FileExtension, IconConfig> = {
  pdf:  { bg: 'bg-[rgba(192,57,43,0.15)]',   text: 'text-[var(--red)]',      label: 'PDF' },
  png:  { bg: 'bg-[rgba(74,103,65,0.2)]',     text: 'text-[var(--sage)]',     label: 'PNG' },
  jpg:  { bg: 'bg-[rgba(74,103,65,0.2)]',     text: 'text-[var(--sage)]',     label: 'JPG' },
  jpeg: { bg: 'bg-[rgba(74,103,65,0.2)]',     text: 'text-[var(--sage)]',     label: 'JPG' },
  tiff: { bg: 'bg-[rgba(123,159,199,0.15)]',  text: 'text-[var(--blue-dim)]', label: 'TIF' },
  tif:  { bg: 'bg-[rgba(123,159,199,0.15)]',  text: 'text-[var(--blue-dim)]', label: 'TIF' },
};

type Status = FileQueueItem['status'];

const STATUS_DOT: Record<Status, { color: string; animate: string }> = {
  waiting:    { color: 'bg-[var(--chrome-4)]', animate: '' },
  processing: { color: 'bg-[var(--amber)]',    animate: 'animate-trust-pulse' },
  done:       { color: 'bg-[var(--sage)]',     animate: '' },
  error:      { color: 'bg-[var(--red)]',      animate: '' },
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

const QueueItemRow: React.FC<{ item: FileQueueItem }> = ({ item }) => {
  const icon = FILE_ICON[item.extension];
  const dot = STATUS_DOT[item.status];

  const metaParts: string[] = [formatSize(item.size)];
  if (item.pageCount != null) metaParts.push(`${item.pageCount}p`);
  const meta = metaParts.join(' · ');

  return (
    <div className="flex flex-col px-[6px] py-[6px] rounded-[6px] hover:bg-white/[0.05] transition-colors duration-100">
      <div className="flex items-center gap-[7px]">
        <div
          className={`w-[22px] h-[26px] rounded-[3px] flex items-center justify-center font-mono text-[6px] font-bold tracking-[0.3px] flex-shrink-0 ${icon.bg} ${icon.text}`}
        >
          {icon.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-white/75 truncate">{item.name}</p>
          <p className="font-mono text-[10px] text-[var(--chrome-4)] mt-px">{meta}</p>
        </div>
        <span
          className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${dot.color} ${dot.animate}`}
        />
      </div>
      {item.status === 'processing' && (
        <div className="h-[2px] bg-[var(--chrome-3)] rounded-full overflow-hidden mt-[5px] ml-[29px]">
          <div
            className="h-full bg-[var(--amber)] rounded-full transition-all duration-300"
            style={{ width: `${item.progress ?? 0}%` }}
          />
        </div>
      )}
    </div>
  );
};

interface QueueSidebarProps {}

export const QueueSidebar: React.FC<QueueSidebarProps> = () => {
  const items = useQueueStore((s) => s.items);

  return (
    <aside className="w-60 flex-shrink-0 bg-[var(--chrome-2)] border-r border-white/[0.06] flex flex-col overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-[14px] pt-[14px] pb-[10px]">
        <span className="font-mono text-[10px] font-semibold tracking-[1px] uppercase text-[var(--chrome-4)]">
          Queue
        </span>
        <span className="font-mono text-[11px] text-[var(--chrome-4)] bg-white/[0.06] rounded-[10px] px-[7px] py-px">
          {items.length}
        </span>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--chrome-3)] [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-track]:bg-transparent">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24">
            <p className="font-mono text-[11px] text-[var(--chrome-4)] text-center leading-relaxed">
              Drop files to begin
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px">
            {items.map((item) => (
              <QueueItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mx-[14px] my-2" />

      {/* Usage stats */}
      <div className="px-[14px] pb-[14px] flex flex-col gap-2">
        <span className="font-mono text-[10px] font-semibold tracking-[1px] uppercase text-[var(--chrome-4)] mb-1">
          This Month
        </span>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[var(--chrome-4)]">Pages used</span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">0 / —</span>
        </div>
        <div className="h-[3px] bg-[var(--chrome-3)] rounded-full overflow-hidden mt-0.5">
          <div className="h-full w-0 bg-[var(--amber)] rounded-full" />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[10px] text-[var(--chrome-4)]">Claude requests</span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">0 / —</span>
        </div>
        <div className="h-[3px] bg-[var(--chrome-3)] rounded-full overflow-hidden mt-0.5">
          <div className="h-full w-0 bg-claude-gradient rounded-full" />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[10px] text-[var(--chrome-4)]">Docs processed</span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">0</span>
        </div>
      </div>
    </aside>
  );
};
