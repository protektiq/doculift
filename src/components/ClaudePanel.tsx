import React from 'react';

interface ClaudePanelProps {}

export const ClaudePanel: React.FC<ClaudePanelProps> = () => {
  return (
    <section
      aria-label="Claude panel"
      className="flex flex-col items-center justify-center gap-4 py-8 text-center"
    >
      <div className="w-10 h-10 rounded-[8px] bg-claude-gradient-diag flex items-center justify-center font-bold text-base text-white">
        C
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-main)] mb-1">Claude AI</p>
        <p className="font-mono text-[11px] text-[var(--text-sub)] leading-[1.6]">
          Connect Claude in Settings
          <br />
          to enable AI features.
        </p>
      </div>
    </section>
  );
};
