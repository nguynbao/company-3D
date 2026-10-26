import React, { useEffect } from 'react';
import { CompanyCampus3D } from './components/scene/CompanyCampus3D';
import { TopNavigationHUD } from './components/hud/TopNavigationHUD';
import { BottomEmployeeDock } from './components/hud/BottomEmployeeDock';
import { EmployeeDetailPanel } from './components/hud/EmployeeDetailPanel';
import { CeoTaskModal } from './components/hud/CeoTaskModal';
import { DepartmentQuickCard } from './components/hud/DepartmentQuickCard';
import { PinnedErrorStack } from './components/hud/PinnedErrorStack';
import { LiveAgentChatPanel } from './components/hud/LiveAgentChatPanel';
import { useCompanyStore } from './store/useCompanyStore';

export function App() {
  const tickAutonomousBehavior = useCompanyStore((s) => s.tickAutonomousBehavior);
  const syncFromBackend = useCompanyStore((s) => s.syncFromBackend);
  const handleSseTaskStep = useCompanyStore((s) => s.handleSseTaskStep);
  const handleSseTaskCompleted = useCompanyStore((s) => s.handleSseTaskCompleted);

  useEffect(() => {
    syncFromBackend();

    // Connect to SSE stream from backend for real-time task progress
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.addEventListener('task_step', (e: MessageEvent) => {
        try {
          handleSseTaskStep(JSON.parse(e.data));
        } catch {
          // ignore parse error
        }
      });
      es.addEventListener('task_completed', (e: MessageEvent) => {
        try {
          handleSseTaskCompleted(JSON.parse(e.data));
        } catch {
          // ignore parse error
        }
      });
    } catch {
      // Fallback if SSE is unavailable
    }

    // Autonomous background behavior loop (idle -> walking -> canteen -> eating/cooking -> chatting)
    const interval = setInterval(() => {
      tickAutonomousBehavior();
    }, 5200);

    return () => {
      clearInterval(interval);
      es?.close();
    };
  }, [syncFromBackend, tickAutonomousBehavior, handleSseTaskStep, handleSseTaskCompleted]);

  return (
    <main className="w-screen h-screen overflow-hidden relative bg-[#0F172A] select-none">
      {/* 3D Interactive World Canvas */}
      <CompanyCampus3D />

      {/* 2D Glassmorphism HUD Overlays (ui-ux-pro-max Design System) */}
      <TopNavigationHUD />
      <PinnedErrorStack />
      <DepartmentQuickCard />
      <LiveAgentChatPanel />
      <EmployeeDetailPanel />
      <BottomEmployeeDock />
      <CeoTaskModal />
    </main>
  );
}

export default App;
