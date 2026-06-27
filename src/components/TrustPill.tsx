import React from 'react';

type TrustPillState = 'idle' | 'processing' | 'network';

interface TrustPillProps {
  state: TrustPillState;
}

export const TrustPill: React.FC<TrustPillProps> = ({ state }) => {
  const isNetwork = state === 'network';

  const pillClass = isNetwork
    ? 'bg-[rgba(123,159,199,0.12)] border-[rgba(123,159,199,0.3)] text-[var(--blue-dim)]'
    : 'bg-[rgba(232,160,32,0.12)] border-[rgba(232,160,32,0.3)] text-[var(--amber)]';

  const dotColor = isNetwork ? 'bg-[var(--blue-dim)]' : 'bg-[var(--amber)]';
  const dotAnimate = state === 'processing' ? 'animate-trust-pulse' : '';

  return (
    <div
      className={`flex items-center gap-[7px] rounded-full pl-2 pr-[10px] py-1 font-mono text-[11px] font-medium tracking-[0.2px] border ${pillClass}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${dotColor} ${dotAnimate}`} />
      {isNetwork
        ? 'Connecting to Claude API · encrypted'
        : 'Processing locally · no network'}
    </div>
  );
};
