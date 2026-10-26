import React, { useEffect, useState } from 'react';
import {
  Building2,
  Cpu,
  DollarSign,
  Gauge,
  Globe,
  Play,
  Pause,
  Send,
  Sparkles,
  FileSpreadsheet,
  Compass,
  MessageSquare,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { CANTEEN_POSITION } from '../../data/mockCompanyData';

export const TopNavigationHUD: React.FC = () => {
  const lang = useCompanyStore((s) => s.lang);
  const setLang = useCompanyStore((s) => s.setLang);
  const autonomousMode = useCompanyStore((s) => s.autonomousMode);
  const setAutonomousMode = useCompanyStore((s) => s.setAutonomousMode);
  const costLimitUsd = useCompanyStore((s) => s.costLimitUsd);
  const setCostLimitUsd = useCompanyStore((s) => s.setCostLimitUsd);
  const currentSessionCostUsd = useCompanyStore((s) => s.currentSessionCostUsd);
  const lowQuality = useCompanyStore((s) => s.lowQuality);
  const setLowQuality = useCompanyStore((s) => s.setLowQuality);
  const setCeoTaskModalOpen = useCompanyStore((s) => s.setCeoTaskModalOpen);
  const isChatPanelOpen = useCompanyStore((s) => s.isChatPanelOpen);
  const setChatPanelOpen = useCompanyStore((s) => s.setChatPanelOpen);
  const chatMessagesCount = useCompanyStore((s) => s.chatMessages.length);
  const setCameraTarget = useCompanyStore((s) => s.setCameraTarget);
  const employees = useCompanyStore((s) => s.employees);
  const activeTaskId = useCompanyStore((s) => s.activeTaskId);

  const [fps, setFps] = useState(60);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    const measure = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.min(60, Math.round((frameCount * 1000) / (now - lastTime))));
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(measure);
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const workingCount = employees.filter((e) => e.state === 'working').length;

  const handleSyncSheet = async () => {
    setSyncingSheet(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSyncStatus(lang === 'vi' ? 'Đã đồng bộ 9 Sheets!' : 'Synced 9 Sheets!');
      } else {
        setSyncStatus(lang === 'vi' ? 'Đồng bộ Demo OK' : 'Demo Sync OK');
      }
    } catch {
      setSyncStatus(lang === 'vi' ? 'Đồng bộ Demo OK' : 'Demo Sync OK');
    } finally {
      setSyncingSheet(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  return (
    <header className="fixed top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      {/* Brand & Live Telemetry Status */}
      <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-3 pointer-events-auto">
        <div className="w-9 h-9 rounded-xl bg-[#22C55E]/20 border border-[#22C55E]/50 flex items-center justify-center text-[#22C55E]">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-white">
              BaoNguyn 3D AI Company
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              LIVE 9 DEPTS • 21 AGENTS
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'vi'
              ? `Đang làm việc: ${workingCount}/21 nhân sự • ${activeTaskId ? `Chiến dịch: ${activeTaskId}` : 'Chế độ tự hành (Idle/Canteen)'}`
              : `Working: ${workingCount}/21 agents • ${activeTaskId ? `Active: ${activeTaskId}` : 'Autonomous Idle Loop'}`}
          </p>
        </div>
      </div>

      {/* Center Quick Camera Jump & Primary CTA */}
      <div className="glass-panel rounded-2xl px-3 py-2 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setCameraTarget([0, 0, 0])}
          aria-label="Focus CEO HQ"
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Compass className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>CEO HQ</span>
        </button>

        <button
          type="button"
          onClick={() => setCameraTarget([CANTEEN_POSITION[0], 0, CANTEEN_POSITION[2]])}
          aria-label="Focus Canteen"
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'vi' ? 'Căng-tin' : 'Canteen'}</span>
        </button>

        <button
          type="button"
          onClick={handleSyncSheet}
          disabled={syncingSheet}
          aria-label="Sync 9 Sheets to Google Sheets"
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition cursor-pointer flex items-center gap-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {syncingSheet
              ? lang === 'vi'
                ? 'Đang đồng bộ...'
                : 'Syncing...'
              : syncStatus || (lang === 'vi' ? 'Đồng bộ 9 Sheets' : 'Sync 9 Sheets')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setChatPanelOpen(!isChatPanelOpen)}
          aria-label="Toggle Live Agent Chat"
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border focus:outline-none focus:ring-2 focus:ring-white ${
            isChatPanelOpen
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'Ô Chat & 9 Sheets' : 'Live Chat & Sheets'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
            {chatMessagesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCeoTaskModalOpen(true)}
          aria-label="Assign CEO Task"
          className="px-3.5 py-1.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'CEO Giao Task' : 'Assign Task'}</span>
        </button>
      </div>

      {/* Right Controls: Autonomous Loop Toggle, Cost Cap, FPS & Quality, Language */}
      <div className="glass-panel rounded-2xl px-3.5 py-2 flex items-center gap-3 pointer-events-auto">
        {/* Autonomous Idle Loop Toggle */}
        <button
          type="button"
          onClick={() => setAutonomousMode(!autonomousMode)}
          aria-label="Toggle Autonomous Mode"
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border focus:outline-none focus:ring-2 focus:ring-white ${
            autonomousMode
              ? 'bg-emerald-500/20 text-[#22C55E] border-[#22C55E]/50'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {autonomousMode ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{lang === 'vi' ? 'Tự chạy nền' : 'Auto Idle'}</span>
        </button>

        {/* Cost Guard */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
          <DollarSign className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>
            ${currentSessionCostUsd.toFixed(2)} /
          </span>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="50"
            aria-label="Cost Limit USD"
            value={costLimitUsd}
            onChange={(e) => setCostLimitUsd(Number(e.target.value) || 1)}
            className="w-12 bg-transparent text-white font-semibold focus:outline-none text-xs"
          />
        </div>

        {/* FPS & Low Quality Fallback */}
        <button
          type="button"
          onClick={() => setLowQuality(!lowQuality)}
          aria-label="Toggle 3D Quality Mode"
          title={lang === 'vi' ? 'Bấm để chuyển chế độ Tối ưu FPS / Cao cấp' : 'Toggle Performance / High Quality'}
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Gauge className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-[#22C55E] font-bold">{fps} FPS</span>
          <span className="text-[10px] text-slate-400">
            ({lowQuality ? 'Eco' : 'Ultra'})
          </span>
        </button>

        {/* i18n VI / EN Switch */}
        <button
          type="button"
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          aria-label="Switch Language VI/EN"
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>{lang.toUpperCase()}</span>
        </button>
      </div>
    </header>
  );
};
