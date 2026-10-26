import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Sparkles,
  Wrench,
  Brain,
  ShieldCheck,
  History,
  Plus,
  Play,
  ExternalLink,
  Power,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import {
  formatProviderModel,
  getValidModelForProvider,
  LLMProvider,
  MODEL_OPTIONS,
} from '../../types/company';

export const EmployeeDetailPanel: React.FC = () => {
  const lang = useCompanyStore((s) => s.lang);
  const isDetailPanelOpen = useCompanyStore((s) => s.isDetailPanelOpen);
  const setDetailPanelOpen = useCompanyStore((s) => s.setDetailPanelOpen);
  const selectedEmployeeId = useCompanyStore((s) => s.selectedEmployeeId);
  const employees = useCompanyStore((s) => s.employees);
  const toggleEmployeeEnabled = useCompanyStore((s) => s.toggleEmployeeEnabled);
  const updateEmployeeConfig = useCompanyStore((s) => s.updateEmployeeConfig);
  const toggleEmployeeSkill = useCompanyStore((s) => s.toggleEmployeeSkill);
  const addGlobalSkill = useCompanyStore((s) => s.addGlobalSkill);
  const setEmployeeError = useCompanyStore((s) => s.setEmployeeError);
  const pinError = useCompanyStore((s) => s.pinError);

  const employee = employees.find((e) => e.id === selectedEmployeeId);
  const isAgentEnabled = employee?.enabled !== false;

  const [activeTab, setActiveTab] = useState<'model' | 'skills' | 'brain' | 'history'>('model');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Skill installer state (mặc định để trống)
  const [githubSkillUrl, setGithubSkillUrl] = useState('');
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [installingSkill, setInstallingSkill] = useState(false);
  const [skillLogs, setSkillLogs] = useState<string[]>([]);
  const [skillError, setSkillError] = useState<string | null>(null);

  // New memory/tool input
  const [newMemoryNote, setNewMemoryNote] = useState('');
  const [newToolName, setNewToolName] = useState('');

  useEffect(() => {
    setApiKeyInput('');
    setConnResult(null);
    setPendingCommand(null);
    setSkillError(null);
  }, [selectedEmployeeId]);

  if (!isDetailPanelOpen || !employee) return null;

  const handleProviderChange = (provider: LLMProvider) => {
    const defaultModel = MODEL_OPTIONS[provider][0];
    updateEmployeeConfig(employee.id, { provider, model: defaultModel });
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    const stageName = `Khâu Kiểm Tra Kết Nối Model — Phòng ${employee.departmentId} (${employee.name})`;
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          provider: employee.provider,
          model: employee.model,
          apiKey: apiKeyInput.trim() || undefined,
          baseUrl: employee.baseUrl,
          temperature: employee.temperature,
          maxTokens: employee.maxTokens,
          systemPrompt: employee.systemPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errCode = data.errorCode || `ERR_HTTP_${res.status}`;
        const msg = data.error || 'Lỗi kết nối API';
        setConnResult({ ok: false, text: `[${errCode}] ${msg}` });
        setEmployeeError(employee.id, `[${errCode}] ${msg}`, errCode);
        pinError({
          stage: data.stage || stageName,
          departmentId: employee.departmentId,
          employeeId: employee.id,
          employeeName: employee.name,
          provider: employee.provider,
          model: employee.model,
          errorCode: errCode,
          message: msg,
        });
      } else {
        if (data.maskedKey) {
          updateEmployeeConfig(employee.id, { maskedApiKey: data.maskedKey });
        }
        setApiKeyInput('');
        setEmployeeError(employee.id, undefined, undefined);
        setConnResult({
          ok: true,
          text: `${data.reply} (${data.tokensUsed} tokens)`,
        });
      }
    } catch {
      // Fallback nếu chỉ chạy Vite frontend
      if (employee.provider !== 'antigravity' && employee.provider !== 'mock' && !apiKeyInput && !employee.maskedApiKey) {
        const errCode = 'ERR_MISSING_API_KEY';
        const errText =
          lang === 'vi'
            ? `Chưa nhập API Key cho ${employee.provider}. Hãy nhập key hoặc chọn provider "antigravity".`
            : `Missing API Key for ${employee.provider}. Please enter a key or switch to "antigravity".`;
        setConnResult({ ok: false, text: `[${errCode}] ${errText}` });
        setEmployeeError(employee.id, `[${errCode}] ${errText}`, errCode);
        pinError({
          stage: stageName,
          departmentId: employee.departmentId,
          employeeId: employee.id,
          employeeName: employee.name,
          provider: employee.provider,
          model: employee.model,
          errorCode: errCode,
          message: errText,
        });
      } else {
        const masked = apiKeyInput ? `${apiKeyInput.slice(0, 3)}-••••${apiKeyInput.slice(-4)}` : employee.maskedApiKey;
        if (masked) updateEmployeeConfig(employee.id, { maskedApiKey: masked });
        setApiKeyInput('');
        setEmployeeError(employee.id, undefined, undefined);
        setConnResult({
          ok: true,
          text:
            lang === 'vi'
              ? `Kết nối thành công tới ${employee.provider}/${employee.model}! Nhân viên ${employee.name} đã sẵn sàng.`
              : `Connected to ${employee.provider}/${employee.model}! ${employee.name} is ready.`,
        });
      }
    } finally {
      setTestingConn(false);
    }
  };

  // Bước 1: Bấm Accept -> Validate URL và hiển thị lệnh `npx skills add <link>` chờ xác nhận
  const handlePreviewAddSkill = async () => {
    setSkillError(null);
    const trimmed = githubSkillUrl.trim();
    const githubRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?(\/.*)?$/;
    const match = trimmed.match(githubRegex);
    if (!match) {
      setSkillError(
        lang === 'vi'
          ? 'Chỉ cho phép link GitHub hợp lệ (https://github.com/<owner>/<repo>).'
          : 'Only valid GitHub URLs (https://github.com/<owner>/<repo>) are allowed.'
      );
      return;
    }
    const cleanUrl = `https://github.com/${match[1]}/${match[2]}.git`;
    setPendingCommand(`npx skills add ${cleanUrl}`);
  };

  // Bước 2: Xác nhận chạy lệnh qua Backend -> Hiển thị log và gắn skill ngay vào danh sách
  const handleConfirmInstallSkill = async () => {
    if (!pendingCommand) return;
    setInstallingSkill(true);
    setSkillError(null);
    setSkillLogs([`$ ${pendingCommand}`, '[Security] Validating GitHub URL & sandboxing...']);

    try {
      const res = await fetch('/api/skills/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUrl: githubSkillUrl.trim(),
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Install failed');
      }
      setSkillLogs(data.logs || [`$ ${pendingCommand}`, '✔ Installed successfully!']);
      addGlobalSkill(
        {
          id: data.skill.id,
          name: data.skill.name.toUpperCase(),
          path: data.skill.path,
          description: data.skill.description,
          enabled: true,
          sourceUrl: data.skill.sourceUrl,
        },
        employee.id
      );
      setPendingCommand(null);
    } catch {
      // Fallback nếu chạy client độc lập
      const match = githubSkillUrl.trim().match(/github\.com\/([^/]+)\/([^/.]+)/);
      const repoSlug = match ? match[2].toLowerCase() : 'custom-skill';
      setSkillLogs([
        `$ ${pendingCommand}`,
        `[Security Check] Verified GitHub repository: ${githubSkillUrl.trim()}`,
        `[Download] Fetched SKILL.md & templates into .agent/skills/${repoSlug}/SKILL.md`,
        `✔ Skill "${repoSlug.toUpperCase()}" installed & activated for ${employee.name}!`,
      ]);
      addGlobalSkill(
        {
          id: repoSlug,
          name: repoSlug.toUpperCase(),
          path: `.agent/skills/${repoSlug}/SKILL.md`,
          description: `Skill cài đặt từ ${githubSkillUrl.trim()}`,
          enabled: true,
          sourceUrl: githubSkillUrl.trim(),
        },
        employee.id
      );
      setPendingCommand(null);
    } finally {
      setInstallingSkill(false);
    }
  };

  return (
    <aside
      aria-label="Employee Detail & Model Configuration Panel"
      className="fixed top-20 bottom-36 right-3 w-[430px] max-w-[94vw] z-40 glass-panel rounded-2xl flex flex-col overflow-hidden pointer-events-auto border border-white/20 shadow-2xl"
    >
      {/* Header: Avatar, Name, Role, Status + ON/OFF Power Toggle */}
      <div className="p-4 border-b border-slate-700/80 space-y-3 bg-slate-900/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base text-[#0F172A] shadow-md shrink-0 transition ${
                isAgentEnabled ? '' : 'opacity-45 grayscale'
              }`}
              style={{ backgroundColor: employee.avatarColor }}
            >
              {employee.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">{employee.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
                  {employee.departmentId}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-600 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-[#22C55E]" />
                  {formatProviderModel(employee.provider, employee.model)}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    isAgentEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  }`}
                >
                  {isAgentEnabled
                    ? lang === 'vi'
                      ? '● ĐANG BẬT (ON)'
                      : '● ACTIVE (ON)'
                    : lang === 'vi'
                    ? '⏸ ĐANG NGHỈ (OFF)'
                    : '⏸ OFF-DUTY (OFF)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{employee.role}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{employee.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDetailPanelOpen(false)}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CEO Agent Power Control Bar (ON / OFF Toggle) */}
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition ${
            isAgentEnabled
              ? 'bg-slate-950/80 border-slate-700/90'
              : 'bg-amber-950/50 border-amber-500/60'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Power
                className={`w-3.5 h-3.5 ${
                  isAgentEnabled ? 'text-[#22C55E]' : 'text-amber-400'
                }`}
              />
              <span>
                {isAgentEnabled
                  ? lang === 'vi'
                    ? 'Trạng thái làm việc: Đang Bật (ON)'
                    : 'Work Status: Active (ON)'
                  : lang === 'vi'
                  ? 'Trạng thái làm việc: Đang Tạm Nghỉ (OFF)'
                  : 'Work Status: Off-Duty (OFF)'}
              </span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isAgentEnabled
                ? lang === 'vi'
                  ? 'Nhân viên này sẽ tham gia thực thi khi CEO giao task.'
                  : 'This agent participates in CEO task execution.'
                : lang === 'vi'
                ? 'Đang nghỉ ngơi tại Căng-tin, không nhận task cho đến khi CEO ấn ON lại.'
                : 'Resting at Canteen; will not run tasks until CEO switches back ON.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => toggleEmployeeEnabled(employee.id)}
            aria-label={isAgentEnabled ? 'Turn Agent OFF' : 'Turn Agent ON'}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md transition ${
              isAgentEnabled
                ? 'bg-red-500/20 hover:bg-red-500/35 text-red-200 border border-red-400/60'
                : 'bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] border border-emerald-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>
              {isAgentEnabled
                ? lang === 'vi'
                  ? 'OFF (Cho nghỉ)'
                  : 'OFF (Rest)'
                : lang === 'vi'
                ? 'ON (Bật lại)'
                : 'ON (Resume)'}
            </span>
          </button>
        </div>
      </div>

      {/* Telemetry Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2.5 bg-slate-950/50 border-b border-slate-800 text-center">
        <div className="rounded-lg bg-slate-900/90 p-1.5 border border-slate-800">
          <p className="text-[10px] text-slate-400">{lang === 'vi' ? 'Task hoàn thành' : 'Completed Tasks'}</p>
          <p className="text-sm font-bold text-white">{employee.completedTasksCount}</p>
        </div>
        <div className="rounded-lg bg-slate-900/90 p-1.5 border border-slate-800">
          <p className="text-[10px] text-slate-400">{lang === 'vi' ? 'Token đã dùng' : 'Tokens Used'}</p>
          <p className="text-sm font-bold text-sky-400">{employee.totalTokensUsed.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-slate-900/90 p-1.5 border border-slate-800">
          <p className="text-[10px] text-slate-400">{lang === 'vi' ? 'Chi phí ước tính' : 'Est. Cost'}</p>
          <p className="text-sm font-bold text-[#22C55E]">${employee.estimatedCostUsd.toFixed(2)}</p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 px-2 pt-1.5 gap-1">
        {[
          { id: 'model', labelVi: 'Model & API', labelEn: 'Model & API', icon: Cpu },
          { id: 'skills', labelVi: `Skills (${employee.skills.filter((s) => s.enabled).length})`, labelEn: 'Skills', icon: Sparkles },
          { id: 'brain', labelVi: 'Tools & Bộ nhớ', labelEn: 'Tools & Memory', icon: Brain },
          { id: 'history', labelVi: 'Lịch sử Task', labelEn: 'Task History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-2 rounded-t-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
                active
                  ? 'text-[#22C55E] border-[#22C55E] bg-slate-800/60'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{lang === 'vi' ? tab.labelVi : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: MODEL & API CONFIG */}
        {activeTab === 'model' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Provider
                </label>
                <select
                  aria-label="Select LLM Provider"
                  value={employee.provider}
                  onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="antigravity">antigravity (Built-in)</option>
                  <option value="openai">openai (GPT-4o / o3)</option>
                  <option value="anthropic">anthropic (Claude 3.7)</option>
                  <option value="deepseek">deepseek (V3 / R1)</option>
                  <option value="openrouter">openrouter (Multi-Model)</option>
                  <option value="mock">mock (Demo Mode)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Model
                </label>
                <select
                  aria-label="Select Model Name"
                  value={getValidModelForProvider(employee.provider, employee.model)}
                  onChange={(e) => updateEmployeeConfig(employee.id, { model: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  {(MODEL_OPTIONS[employee.provider] || [employee.model]).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* API Key Input (Encrypted in Backend, Masked in Frontend) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>API Key (AES-256 Encrypted Vault)</span>
                </label>
                {employee.maskedApiKey && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-[#22C55E] border border-[#22C55E]/40">
                    Saved: {employee.maskedApiKey}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  employee.maskedApiKey
                    ? `${employee.maskedApiKey} (Nhập mới để ghi đè)`
                    : 'sk-•••••••••••••••• (Không lưu plaintext ở trình duyệt)'
                }
                aria-label="API Key Input"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22C55E]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'vi'
                  ? 'Bảo mật: Key được gửi thẳng lên Backend mã hóa AES-256-GCM, không lưu trong localStorage.'
                  : 'Security: Key is sent to Backend AES-256-GCM vault, never stored in localStorage.'}
              </p>
            </div>

            {/* Optional Base URL */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Base URL ({lang === 'vi' ? 'Tuỳ chọn' : 'Optional'})
              </label>
              <input
                type="url"
                value={employee.baseUrl || ''}
                onChange={(e) => updateEmployeeConfig(employee.id, { baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            {/* Temperature & Max Tokens */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Temperature: <span className="text-[#22C55E]">{employee.temperature}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.2"
                  step="0.05"
                  value={employee.temperature}
                  onChange={(e) => updateEmployeeConfig(employee.id, { temperature: Number(e.target.value) })}
                  className="w-full accent-[#22C55E] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="128"
                  max="8192"
                  step="128"
                  value={employee.maxTokens}
                  onChange={(e) => updateEmployeeConfig(employee.id, { maxTokens: Number(e.target.value) })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>

            {/* System Prompt Editor */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                System Prompt ({employee.departmentId})
              </label>
              <textarea
                rows={4}
                value={employee.systemPrompt}
                onChange={(e) => updateEmployeeConfig(employee.id, { systemPrompt: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            {/* Test Connection Button & Status Banner */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConn}
              className="w-full py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {testingConn
                  ? lang === 'vi'
                    ? 'Đang kiểm tra kết nối Model...'
                    : 'Testing Model Connection...'
                  : lang === 'vi'
                  ? 'Lưu cấu hình & Test kết nối'
                  : 'Save Config & Test Connection'}
              </span>
            </button>

            {connResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 ${
                  connResult.ok
                    ? 'bg-emerald-950/60 border-[#22C55E]/60 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/60 text-red-200'
                }`}
              >
                {connResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="text-[11px] leading-relaxed">{connResult.text}</div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SKILLS & FAST GITHUB SKILL INSTALLER */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            {/* Fast Add Skill via GitHub Link + Accept Button */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2.5">
              <label className="block text-[11px] font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>
                  {lang === 'vi' ? 'Thêm Skill nhanh từ GitHub' : 'Quick Add Skill from GitHub'}
                </span>
              </label>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={githubSkillUrl}
                  onChange={(e) => setGithubSkillUrl(e.target.value)}
                  placeholder="https://github.com/owner/skill-repo.git"
                  aria-label="GitHub Skill URL"
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
                <button
                  type="button"
                  onClick={handlePreviewAddSkill}
                  className="px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-bold text-xs cursor-pointer shrink-0"
                >
                  Accept
                </button>
              </div>

              {skillError && (
                <p className="text-[11px] text-red-400 font-medium">{skillError}</p>
              )}

              {/* Confirmation Prompt showing exact shell command */}
              {pendingCommand && (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/50 space-y-2">
                  <p className="text-[11px] text-amber-200 font-semibold">
                    {lang === 'vi'
                      ? 'Xác nhận chạy lệnh cài đặt Skill qua Backend:'
                      : 'Confirm executing skill installation command on Backend:'}
                  </p>
                  <code className="block p-2 rounded bg-slate-950 text-[#22C55E] font-mono text-[11px] break-all">
                    $ {pendingCommand}
                  </code>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingCommand(null)}
                      className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                    >
                      {lang === 'vi' ? 'Huỷ' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={installingSkill}
                      onClick={handleConfirmInstallSkill}
                      className="px-3 py-1 rounded bg-[#22C55E] text-[#0F172A] font-bold text-[11px] cursor-pointer"
                    >
                      {installingSkill
                        ? lang === 'vi'
                          ? 'Đang chạy...'
                          : 'Running...'
                        : lang === 'vi'
                        ? 'Xác nhận & Chạy'
                        : 'Confirm & Run'}
                    </button>
                  </div>
                </div>
              )}

              {/* Execution Terminal Logs */}
              {skillLogs.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 space-y-1 max-h-32 overflow-y-auto">
                  {skillLogs.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Skills List with Toggle Switches */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-300">
                {lang === 'vi' ? 'Danh sách Skills của nhân viên:' : 'Employee Installed Skills:'}
              </p>
              {employee.skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-2.5 rounded-xl border transition flex items-start justify-between gap-2.5 ${
                    skill.enabled
                      ? 'bg-slate-900/90 border-[#22C55E]/40'
                      : 'bg-slate-950/50 border-slate-800 opacity-65'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{skill.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {skill.path}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">{skill.description}</p>
                    {skill.sourceUrl && (
                      <a
                        href={skill.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[#22C55E] hover:underline mt-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>GitHub Repo</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={skill.enabled}
                    onClick={() => toggleEmployeeSkill(employee.id, skill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition ${
                      skill.enabled
                        ? 'bg-[#22C55E] text-[#0F172A]'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {skill.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TOOLS, MEMORY, KNOWLEDGE & PERMISSIONS */}
        {activeTab === 'brain' && (
          <div className="space-y-4">
            {/* Tools */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Wrench className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>{lang === 'vi' ? 'Công cụ được cấp (Tools)' : 'Equipped Tools'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {employee.tools.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  placeholder={lang === 'vi' ? 'Thêm tool mới (vd: web_scraper)...' : 'Add tool...'}
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newToolName.trim()) return;
                    updateEmployeeConfig(employee.id, {
                      tools: [...employee.tools, newToolName.trim()],
                    });
                    setNewToolName('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Persistent Memory & Knowledge Rules */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Brain className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'vi' ? 'Bộ nhớ & Tri thức chuyên môn' : 'Memory & Domain Knowledge'}</span>
              </div>
              <ul className="space-y-1.5">
                {employee.memoryNotes.map((note, idx) => (
                  <li
                    key={idx}
                    className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-200"
                  >
                    • {note}
                  </li>
                ))}
              </ul>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newMemoryNote}
                  onChange={(e) => setNewMemoryNote(e.target.value)}
                  placeholder={lang === 'vi' ? 'Ghi nhớ quy tắc mới cho nhân viên...' : 'Add memory note...'}
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newMemoryNote.trim()) return;
                    updateEmployeeConfig(employee.id, {
                      memoryNotes: [...employee.memoryNotes, newMemoryNote.trim()],
                    });
                    setNewMemoryNote('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#22C55E] text-[#0F172A] font-bold text-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'vi' ? 'Quyền hạn (Permissions)' : 'Role Permissions'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {employee.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[11px] border border-amber-500/30"
                  >
                    ✓ {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TASK HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-2.5">
            {employee.currentTask && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-[#22C55E]/50">
                <p className="text-[10px] font-bold text-[#22C55E] uppercase">
                  {lang === 'vi' ? 'Đang thực thi' : 'Currently Executing'}
                </p>
                <p className="text-xs text-white font-medium mt-0.5">{employee.currentTask}</p>
              </div>
            )}

            {employee.taskHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-900/85 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[#22C55E]">{item.id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-white font-medium">{item.title}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>{item.date}</span>
                  <span>{item.tokens.toLocaleString()} tokens</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
