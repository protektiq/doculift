import React from 'react';
import { TrustPill } from './TrustPill';

export type NavView = 'process' | 'history' | 'settings';

interface TopBarProps {
  activeView: NavView;
  onNavChange: (view: NavView) => void;
  trustPillState: 'idle' | 'processing' | 'network';
  tier: string;
}

const NAV_ITEMS: Array<{ view: NavView; label: string }> = [
  { view: 'process', label: 'Process' },
  { view: 'history', label: 'History' },
  { view: 'settings', label: 'Settings' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onNavChange,
  trustPillState,
  tier,
}) => {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-[var(--chrome)] border-b border-white/[0.07] flex-shrink-0 gap-4">
      <div className="flex items-center gap-5">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 no-underline">
          <div className="w-[26px] h-[26px] bg-[var(--amber)] rounded-[5px] flex items-center justify-center flex-shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#1C2333"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="2" y="1" width="8" height="11" rx="1" />
              <line x1="4" y1="4" x2="8" y2="4" />
              <line x1="4" y1="6.5" x2="8" y2="6.5" />
              <line x1="4" y1="9" x2="6.5" y2="9" />
              <polyline points="8.5,7.5 10.5,9.5 12.5,7" />
            </svg>
          </div>
          <span className="font-mono font-semibold text-[15px] text-white tracking-[-0.3px]">
            DocuLift
          </span>
        </a>

        {/* Nav */}
        <nav className="flex gap-0.5">
          {NAV_ITEMS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              onClick={() => onNavChange(view)}
              className={`font-sans text-[13px] font-medium px-[10px] py-[5px] rounded-[6px] transition-colors duration-150 ${
                activeView === view
                  ? 'text-white bg-white/10'
                  : 'text-[var(--blue-dim)] hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-[10px]">
        <TrustPill state={trustPillState} />
        <span className="font-mono text-[11px] font-semibold text-[var(--chrome-4)] bg-white/[0.07] border border-white/10 rounded px-[7px] py-[3px] tracking-[0.5px] uppercase">
          {tier}
        </span>
        {/* Avatar placeholder — user identity wired in a later step */}
        <div className="w-7 h-7 rounded-full bg-[var(--chrome-3)] border border-white/[0.15] flex items-center justify-center text-[11px] font-semibold text-[var(--blue-dim)] cursor-pointer select-none">
          U
        </div>
      </div>
    </header>
  );
};
