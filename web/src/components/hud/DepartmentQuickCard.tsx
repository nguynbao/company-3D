import React from 'react';
import { X, Users, FileText, Play } from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { formatProviderModel } from '../../types/company';

export const DepartmentQuickCard: React.FC = () => {
  const lang = useCompanyStore((s) => s.lang);
  const selectedDepartmentId = useCompanyStore((s) => s.selectedDepartmentId);
  const setSelectedDepartmentId = useCompanyStore((s) => s.setSelectedDepartmentId);
  const departments = useCompanyStore((s) => s.departments);
  const employees = useCompanyStore((s) => s.employees);
  const focusOnEmployee = useCompanyStore((s) => s.focusOnEmployee);
  const setCeoTaskModalOpen = useCompanyStore((s) => s.setCeoTaskModalOpen);
  const retryDepartmentTask = useCompanyStore((s) => s.retryDepartmentTask);

  if (!selectedDepartmentId) return null;
  const dept = departments.find((d) => d.id === selectedDepartmentId);
  if (!dept) return null;

  const deptEmployees = employees.filter((e) => e.departmentId === dept.id);

  return (
    <aside
      aria-label="Department Quick Summary"
      className="fixed top-20 left-3 w-80 max-w-[90vw] z-30 glass-panel rounded-2xl p-4 pointer-events-auto border border-white/20 space-y-3 shadow-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
          <div>
            <h3 className="text-sm font-bold text-white">{dept.name}</h3>
            <p className="text-[11px] text-slate-300">
              {lang === 'vi' ? dept.roleVi : dept.roleEn}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDepartmentId(null)}
          aria-label="Close Department Card"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Output Sheets & Agent Spec */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <FileText className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>{lang === 'vi' ? 'Đầu ra phụ trách (9 Sheets):' : 'Assigned Output Sheets:'}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {dept.outputSheets.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px] border border-slate-700"
            >
              {s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-mono pt-0.5">
          Spec: {dept.agentFile}
        </p>
      </div>

      {/* Employees in Department */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            {lang === 'vi' ? `Nhân sự phòng (${deptEmployees.length})` : `Department Staff (${deptEmployees.length})`}
          </span>
        </div>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {deptEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => focusOnEmployee(emp.id, true)}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-[#0F172A] shrink-0"
                  style={{ backgroundColor: emp.avatarColor }}
                >
                  {emp.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{emp.role}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#22C55E] shrink-0 ml-2">
                {emp.enabled === false ? 'OFF' : formatProviderModel(emp.provider, emp.model)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        {dept.status === 'error' && (
          <button
            type="button"
            onClick={() => retryDepartmentTask(dept.id)}
            className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold cursor-pointer"
          >
            {lang === 'vi' ? 'Thử lại (Retry)' : 'Retry'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCeoTaskModalOpen(true)}
          className="flex-1 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'Giao việc cho phòng' : 'Assign Task'}</span>
        </button>
      </div>
    </aside>
  );
};
