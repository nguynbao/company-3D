import React, { useState } from 'react';
import {
  AlertTriangle,
  Pin,
  X,
  KeyRound,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';

export const PinnedErrorStack: React.FC = () => {
  const lang = useCompanyStore((s) => s.lang);
  const pinnedErrors = useCompanyStore((s) => s.pinnedErrors);
  const dismissPinnedError = useCompanyStore((s) => s.dismissPinnedError);
  const clearPinnedErrors = useCompanyStore((s) => s.clearPinnedErrors);
  const focusOnEmployee = useCompanyStore((s) => s.focusOnEmployee);
  const focusOnDepartment = useCompanyStore((s) => s.focusOnDepartment);
  const quickFixErrorToAntigravity = useCompanyStore((s) => s.quickFixErrorToAntigravity);

  const [collapsed, setCollapsed] = useState(false);

  if (pinnedErrors.length === 0) return null;

  return (
    <aside
      aria-label="Pinned Pipeline Error Alerts"
      className="fixed top-20 right-4 z-40 w-[410px] max-w-[calc(100vw-2rem)] pointer-events-auto"
    >
      <div className="rounded-2xl bg-slate-950/95 border-2 border-red-500/80 shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 bg-red-950/90 border-b border-red-500/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-red-500/25 border border-red-400 flex items-center justify-center text-red-300 shrink-0">
              <Pin className="w-3.5 h-3.5 rotate-45" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-white tracking-wide">
                  {lang === 'vi'
                    ? `BẢNG GHIM LỖI HỆ THỐNG (${pinnedErrors.length})`
                    : `PINNED SYSTEM ERRORS (${pinnedErrors.length})`}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-mono text-[9px] font-bold">
                  TRY-CATCH
                </span>
              </div>
              <p className="text-[10px] text-red-200/90 truncate">
                {lang === 'vi'
                  ? 'Ghim tự động khâu bị lỗi & mã lỗi API Key của từng Model'
                  : 'Auto-pinned failed workflow stages & model API error codes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={clearPinnedErrors}
              title={lang === 'vi' ? 'Xoá tất cả lỗi đã ghim' : 'Clear all pinned errors'}
              className="px-2 py-1 rounded-lg bg-red-900/70 hover:bg-red-800 text-red-100 text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-red-400/30"
            >
              <Trash2 className="w-3 h-3" />
              <span>{lang === 'vi' ? 'Xoá hết' : 'Clear'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle Pinned Errors"
              className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 cursor-pointer"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error Cards List */}
        {!collapsed && (
          <div className="p-2.5 max-h-[55vh] overflow-y-auto space-y-2">
            {pinnedErrors.map((err) => (
              <div
                key={err.id}
                className="p-3 rounded-xl bg-slate-900/95 border border-red-500/60 space-y-2 shadow-md"
              >
                {/* Top row: Error Code + Timestamp + Unpin */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-red-500/25 border border-red-400 text-red-200 font-mono text-[10px] font-extrabold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      {err.errorCode}
                    </span>
                    {err.taskId && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700">
                        {err.taskId}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 font-mono">{err.timestamp}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismissPinnedError(err.id)}
                    title={lang === 'vi' ? 'Bỏ ghim lỗi này' : 'Unpin this error'}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Stage & Model Info */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <span>📍 {lang === 'vi' ? 'Khâu bị lỗi:' : 'Failed Stage:'}</span>
                    <span className="text-white">{err.stage}</span>
                  </div>

                  {(err.employeeName || err.provider || err.model) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {err.employeeName && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-semibold border border-slate-700">
                          👤 {err.employeeName}
                        </span>
                      )}
                      {err.departmentId && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono border border-slate-700">
                          🏢 {err.departmentId}
                        </span>
                      )}
                      {(err.provider || err.model) && (
                        <span className="px-1.5 py-0.5 rounded bg-red-950/90 text-red-300 font-mono border border-red-500/40">
                          🤖 {err.provider}/{err.model}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Error Message */}
                <p className="text-[11px] text-red-100/95 bg-red-950/40 border border-red-500/30 rounded-lg p-2 leading-relaxed">
                  {err.message}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {err.employeeId ? (
                    <button
                      type="button"
                      onClick={() => focusOnEmployee(err.employeeId!, true)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>
                        {lang === 'vi' ? 'Cấu hình API Key' : 'Set API Key'}
                      </span>
                    </button>
                  ) : err.departmentId ? (
                    <button
                      type="button"
                      onClick={() => focusOnDepartment(err.departmentId!)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>
                        {lang === 'vi' ? 'Mở Phòng Ban' : 'Open Department'}
                      </span>
                    </button>
                  ) : null}

                  {err.employeeId && (
                    <button
                      type="button"
                      onClick={() => quickFixErrorToAntigravity(err.id)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-semibold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>
                        {lang === 'vi' ? 'Đổi Antigravity & Retry' : 'Use Antigravity & Retry'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
