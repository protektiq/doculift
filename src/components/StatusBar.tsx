import React from 'react';

interface StatusBarProps {}

export const StatusBar: React.FC<StatusBarProps> = () => {
  return (
    <footer className="flex items-center justify-between h-[26px] px-4 bg-[var(--chrome-2)] border-t border-white/[0.05] flex-shrink-0">
      <div className="flex items-center gap-[14px]">
        <div className="flex items-center gap-[5px] font-mono text-[10px] text-[var(--chrome-4)]">
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--sage)]" />
          Ready
        </div>
      </div>
      <span className="font-mono text-[10px] text-[var(--chrome-4)]">
        v0.1.0-beta · Tesseract 5
      </span>
    </footer>
  );
};
