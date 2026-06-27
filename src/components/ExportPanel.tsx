import React from 'react';

interface ExportPanelProps {}

type FormatTier = 'free' | 'standard' | 'locked';

interface FormatOption {
  id: string;
  ext: string;
  name: string;
  desc: string;
  tier: FormatTier;
  iconClass: string;
  locked: boolean;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'pdf',
    ext: 'PDF',
    name: 'Searchable PDF',
    desc: 'text layer embedded',
    tier: 'free',
    iconClass: 'bg-[rgba(192,57,43,0.1)] text-[var(--red)]',
    locked: false,
  },
  {
    id: 'txt',
    ext: 'TXT',
    name: 'Plain Text',
    desc: 'clean extracted text',
    tier: 'free',
    iconClass: 'bg-[var(--paper-2)] text-[var(--text-sub)]',
    locked: false,
  },
  {
    id: 'docx',
    ext: 'DOCX',
    name: 'Word Document',
    desc: 'editable with formatting',
    tier: 'standard',
    iconClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563EB]',
    locked: true,
  },
  {
    id: 'csv',
    ext: 'CSV',
    name: 'CSV (tables only)',
    desc: 'structured table data',
    tier: 'locked',
    iconClass: 'bg-[rgba(74,103,65,0.1)] text-[var(--sage)]',
    locked: true,
  },
];

const TIER_BADGE: Record<FormatTier, { className: string; label: string }> = {
  free:     { className: 'bg-[var(--sage-bg)] text-[var(--sage)]', label: 'Free' },
  standard: { className: 'bg-[var(--amber-bg)] text-[var(--amber-dim)]', label: 'Standard' },
  locked:   { className: 'bg-[var(--paper-2)] text-[var(--text-dim)]', label: 'Premium' },
};

export const ExportPanel: React.FC<ExportPanelProps> = () => {
  return (
    <section aria-label="Export panel" className="flex flex-col gap-[14px]">
      {/* Format cards */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-[0.6px] mb-0.5">
          Output format
        </p>
        <div className="flex flex-col gap-[5px]">
          {FORMAT_OPTIONS.map((opt) => {
            const badge = TIER_BADGE[opt.tier];
            return (
              <div
                key={opt.id}
                title={opt.locked ? `Upgrade to ${badge.label} to unlock` : undefined}
                className={`flex items-center justify-between px-[11px] py-[9px] rounded-[6px] border-[1.5px] border-[var(--paper-3)] bg-white transition-all duration-[120ms] ${
                  opt.locked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:border-[var(--amber)] hover:bg-[var(--amber-bg)]'
                }`}
              >
                <div className="flex items-center gap-[9px]">
                  <div
                    className={`w-[26px] h-[30px] rounded-[3px] flex items-center justify-center font-mono text-[7px] font-bold tracking-[0.3px] ${opt.iconClass}`}
                  >
                    {opt.ext}
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-main)]">{opt.name}</p>
                    <p className="font-mono text-[10px] text-[var(--text-sub)] mt-px">
                      {opt.desc}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[9px] font-semibold px-[5px] py-[2px] rounded-[3px] tracking-[0.3px] ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save location */}
      <div>
        <p className="text-[11px] font-semibold text-[var(--text-sub)] uppercase tracking-[0.6px] mb-[6px]">
          Save location
        </p>
        <div className="flex gap-[6px] items-center">
          <div className="flex-1 bg-white border border-[var(--paper-3)] rounded-[6px] px-[10px] py-[7px] font-mono text-[11px] text-[var(--text-sub)] whitespace-nowrap overflow-hidden text-ellipsis">
            ~/Documents/DocuLift/
          </div>
          <button
            type="button"
            className="flex-shrink-0 font-sans text-[12px] font-medium text-[var(--text-sub)] bg-white border border-[var(--paper-3)] rounded-[6px] px-[10px] py-[7px] cursor-pointer transition-all duration-[120ms] hover:bg-[var(--paper-2)] hover:text-[var(--text-main)]"
          >
            Change
          </button>
        </div>
      </div>

      {/* Export button — disabled until a document is processed */}
      <button
        type="button"
        disabled
        className="w-full py-[10px] bg-[var(--chrome)] text-white border-0 rounded-[6px] font-sans text-[13px] font-semibold flex items-center justify-center gap-[7px] opacity-40 cursor-not-allowed"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 9V2M4 6l3 3 3-3" />
          <path d="M2 11h10" />
        </svg>
        Export
      </button>

      {/* Empty state */}
      <p className="font-mono text-[11px] text-[var(--text-dim)] text-center">
        Process a document to export it.
      </p>
    </section>
  );
};
