import React, { useState } from 'react';
import { ExportPanel } from './ExportPanel';
import { ClaudePanel } from './ClaudePanel';

type RightTab = 'export' | 'claude' | 'history';

interface RightPanelProps {}

const TABS: Array<{ id: RightTab; label: string }> = [
  { id: 'export', label: 'Export' },
  { id: 'claude', label: 'Claude AI' },
  { id: 'history', label: 'History' },
];

export const RightPanel: React.FC<RightPanelProps> = () => {
  const [activeTab, setActiveTab] = useState<RightTab>('export');

  return (
    <aside className="w-[280px] flex-shrink-0 bg-[var(--paper)] border-l border-[var(--paper-3)] flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--paper-3)] flex-shrink-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-[10px] font-sans text-[12px] font-medium transition-all duration-[120ms] border-b-2 -mb-px ${
              activeTab === id
                ? 'text-[var(--text-main)] border-[var(--amber)]'
                : 'text-[var(--text-sub)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--paper-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-[14px] flex flex-col gap-[14px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--paper-3)] [&::-webkit-scrollbar-thumb]:rounded-[2px]">
        {activeTab === 'export' && <ExportPanel />}
        {activeTab === 'claude' && <ClaudePanel />}
        {activeTab === 'history' && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="font-mono text-[11px] text-[var(--text-dim)]">
              No documents processed yet.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
