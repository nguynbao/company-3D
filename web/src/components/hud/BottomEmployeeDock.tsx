import React, { useState } from 'react';
import {
  Search,
  Filter,
  Cpu,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { DepartmentId, EmployeeState, formatProviderModel } from '../../types/company';

export const BottomEmployeeDock: React.FC = () => {
  const lang = useCompanyStore((s) => s.lang);
  const employees = useCompanyStore((s) => s.employees);
  const departments = useCompanyStore((s) => s.departments);
  const selectedEmployeeId = useCompanyStore((s) => s.selectedEmployeeId);
  const departmentFilter = useCompanyStore((s) => s.departmentFilter);
  const setDepartmentFilter = useCompanyStore((s) => s.setDepartmentFilter);
  const searchQuery = useCompanyStore((s) => s.searchQuery);
  const setSearchQuery = useCompanyStore((s) => s.setSearchQuery);
  const focusOnEmployee = useCompanyStore((s) => s.focusOnEmployee);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredEmployees = employees.filter((e) => {
    const matchDept = departmentFilter === 'ALL' || e.departmentId === departmentFilter;
    const q = searchQuery.trim().toLowerCase();
    const fullModelLabel = formatProviderModel(e.provider, e.model).toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.departmentId.toLowerCase().includes(q) ||
      fullModelLabel.includes(q);
    return matchDept && matchSearch;
  });

  const stateLabelsVi: Record<EmployeeState, string> = {
    idle: 'Sẵn sàng',
    walking: 'Đang di chuyển',
    working: 'Đang thực thi',
    resting: 'Nghỉ ngơi',
    eating: 'Đang ăn uống',
    cooking: 'Pha chế',
    chatting: 'Tám chuyện',
  };

  const stateLabelsEn: Record<EmployeeState, string> = {
    idle: 'Idle',
    walking: 'Walking',
    working: 'Working',
    resting: 'Resting',
    eating: 'Eating',
    cooking: 'Cooking',
    chatting: 'Chatting',
  };

  const stateDotColor: Record<EmployeeState, string> = {
    working: 'bg-[#22C55E]',
    chatting: 'bg-sky-400',
    eating: 'bg-amber-400',
    cooking: 'bg-orange-400',
    resting: 'bg-purple-400',
    walking: 'bg-slate-400',
    idle: 'bg-slate-500',
  };

  // Trạng thái thu gọn (Ẩn menu dưới, chỉ hiện nút mở lại gọn gàng ở góc dưới)
  if (isCollapsed) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          aria-label="Show employee dock"
          className="glass-panel px-4 py-2 rounded-full border border-white/20 text-xs font-bold text-white hover:border-[#22C55E] transition flex items-center gap-2 shadow-xl cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>
            {lang === 'vi'
              ? `Hiện danh sách nhân sự (${employees.length})`
              : `Show AI Staff Dock (${employees.length})`}
          </span>
          <ChevronUp className="w-4 h-4 text-[#22C55E]" />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Employee Roster Bar"
      className="fixed bottom-3 left-3 right-3 z-30 glass-panel rounded-2xl p-3 pointer-events-auto transition-all"
    >
      {/* Top Filter, Search & Collapse Toggle Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          <button
            type="button"
            onClick={() => setDepartmentFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-white ${
              departmentFilter === 'ALL'
                ? 'bg-[#22C55E] text-[#0F172A]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {lang === 'vi' ? `Tất cả (${employees.length})` : `All (${employees.length})`}
          </button>

          {departments.map((dept) => {
            const count = employees.filter((e) => e.departmentId === dept.id).length;
            const active = departmentFilter === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setDepartmentFilter(dept.id as DepartmentId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white ${
                  active
                    ? 'bg-[#22C55E] text-[#0F172A]'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                <span>{dept.shortName}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            {lang === 'vi'
              ? 'Click đơn: Focus 3D • Double-click: Mở cấu hình & Skills'
              : 'Single-click: Focus 3D • Double-click: Open Config & Skills'}
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'vi' ? 'Tìm tên, phòng ban, model...' : 'Search name, dept, model...'}
              aria-label="Search employees"
              className="pl-8 pr-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#22C55E] w-48"
            />
          </div>

          {/* Nút Ẩn Menu Dưới */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Hide employee dock"
            title={lang === 'vi' ? 'Ẩn thanh nhân viên phía dưới' : 'Hide bottom employee dock'}
            className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition shrink-0 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <span className="hidden sm:inline">{lang === 'vi' ? 'Ẩn menu' : 'Hide'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#22C55E]" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Cards */}
      {filteredEmployees.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400">
          {lang === 'vi'
            ? 'Không tìm thấy nhân viên nào khớp bộ lọc.'
            : 'No AI employees match your current filter.'}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {filteredEmployees.map((emp) => {
            const isSelected = selectedEmployeeId === emp.id;
            const isOff = emp.enabled === false;
            return (
              <div
                key={emp.id}
                role="button"
                tabIndex={0}
                aria-label={`Employee ${emp.name} in ${emp.departmentId}`}
                onClick={() => focusOnEmployee(emp.id, false)}
                onDoubleClick={() => focusOnEmployee(emp.id, true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focusOnEmployee(emp.id, true);
                  }
                }}
                className={`shrink-0 w-56 rounded-xl p-2.5 border transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-white ${
                  isSelected
                    ? 'bg-slate-800/95 border-[#22C55E] shadow-lg ring-1 ring-[#22C55E]/50'
                    : isOff
                    ? 'bg-slate-950/75 border-amber-500/40 opacity-70 hover:opacity-95'
                    : 'bg-[#0F172A]/85 border-slate-700/80 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-[#0F172A] shrink-0 shadow ${
                      isOff ? 'grayscale opacity-60' : ''
                    }`}
                    style={{ backgroundColor: emp.avatarColor }}
                  >
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-white truncate">{emp.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isOff && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50">
                            OFF
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {emp.departmentId}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{emp.role}</p>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOff
                          ? 'bg-amber-400'
                          : emp.errorText
                          ? 'bg-red-500'
                          : stateDotColor[emp.state]
                      }`}
                    />
                    {isOff
                      ? lang === 'vi'
                        ? 'Tạm nghỉ (OFF)'
                        : 'Off-Duty (OFF)'
                      : emp.errorText
                      ? lang === 'vi'
                        ? 'Lỗi API'
                        : 'API Error'
                      : lang === 'vi'
                      ? stateLabelsVi[emp.state]
                      : stateLabelsEn[emp.state]}
                  </span>

                  <span
                    title={formatProviderModel(emp.provider, emp.model)}
                    className="flex items-center gap-1 text-emerald-400 font-mono truncate max-w-[125px]"
                  >
                    <Cpu className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatProviderModel(emp.provider, emp.model)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
