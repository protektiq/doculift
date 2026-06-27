import React, { useState } from 'react';
import { TopBar, NavView } from './components/TopBar';
import { QueueSidebar } from './components/QueueSidebar';
import { Canvas } from './components/Canvas';
import { RightPanel } from './components/RightPanel';
import { StatusBar } from './components/StatusBar';
import { useOcrProcessor } from './hooks/useOcrProcessor';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<NavView>('process');
  useOcrProcessor();

  return (
    <div className="flex flex-col h-screen max-w-[1400px] mx-auto bg-[var(--chrome)]">
      <TopBar
        activeView={activeView}
        onNavChange={setActiveView}
        trustPillState="idle"
        tier="Free"
      />
      <div className="flex flex-1 overflow-hidden">
        <QueueSidebar />
        <Canvas />
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  );
};

export default App;
