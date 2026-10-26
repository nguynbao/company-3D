import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Video,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  Film,
  Upload,
  FolderOpen,
  Trash2,
  Plus,
  AlertTriangle,
  Pin,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { DepartmentId, TaskAttachment } from '../../types/company';

const DEFAULT_LIBRARY_ASSETS: TaskAttachment[] = [
  {
    id: 'vendy_super_power_original.png',
    name: 'vendy_super_power_original.png',
    type: 'image',
    url: '/assets/vendy_super_power_original.png',
    path: 'assets/vendy_super_power_original.png',
  },
  {
    id: 'pikdy_strive_16mm.png',
    name: 'pikdy_strive_16mm.png',
    type: 'image',
    url: '/assets/pikdy_strive_16mm.png',
    path: 'assets/pikdy_strive_16mm.png',
  },
  {
    id: 'vendy_launch_kv.png',
    name: 'vendy_launch_kv.png',
    type: 'image',
    url: '/assets/vendy_launch_kv.png',
    path: 'assets/vendy_launch_kv.png',
  },
  {
    id: 'vendy_combo_deal.png',
    name: 'vendy_combo_deal.png',
    type: 'image',
    url: '/assets/vendy_combo_deal.png',
    path: 'assets/vendy_combo_deal.png',
  },
];

export const CeoTaskModal: React.FC = () => {
  const lang = useCompanyStore((s) => s.lang);
  const isCeoTaskModalOpen = useCompanyStore((s) => s.isCeoTaskModalOpen);
  const setCeoTaskModalOpen = useCompanyStore((s) => s.setCeoTaskModalOpen);
  const departments = useCompanyStore((s) => s.departments);
  const employees = useCompanyStore((s) => s.employees);
  const tasks = useCompanyStore((s) => s.tasks);
  const dispatchCeoTask = useCompanyStore((s) => s.dispatchCeoTask);
  const pinError = useCompanyStore((s) => s.pinError);
  const selectedCampaignContextId = useCompanyStore((s) => s.selectedCampaignContextId);
  const setSelectedCampaignContextId = useCompanyStore((s) => s.setSelectedCampaignContextId);
  const campaignThreads = useCompanyStore((s) => s.campaignThreads);

  const threadList = Object.values(campaignThreads).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const [prompt, setPrompt] = useState('');
  const [targetDepartment, setTargetDepartment] = useState<DepartmentId | 'AUTO'>('AUTO');
  const [priority, setPriority] = useState<'Cao' | 'Trung bình' | 'Thấp'>('Cao');
  const [includeVideo, setIncludeVideo] = useState(false);
  const [formError, setFormError] = useState<{ code: string; stage: string; message: string } | null>(
    null
  );

  // Media attachments (Hình ảnh & Video sản phẩm của CEO - mặc định để trống)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<TaskAttachment[]>(DEFAULT_LIBRARY_ASSETS);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isCeoTaskModalOpen) return;
    setFormError(null);
    fetch('/api/assets/list')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.assets) && data.assets.length > 0) {
          setLibraryAssets(data.assets);
        }
      })
      .catch(() => {
        // fallback to DEFAULT_LIBRARY_ASSETS
      });
  }, [isCeoTaskModalOpen]);

  if (!isCeoTaskModalOpen) return null;

  // Kiểm tra các nhân viên ĐANG BẬT (ON) thuộc phạm vi task chưa có API Key
  const missingKeyEmployees = employees.filter((e) => {
    if (e.enabled === false) return false;
    const inScope =
      targetDepartment === 'AUTO'
        ? includeVideo || e.departmentId !== 'VIDEO'
        : e.departmentId === targetDepartment || e.departmentId === 'MKT-DIRECTOR' || e.departmentId === 'QA-QC';
    const requiresExternalKey = e.provider !== 'antigravity' && e.provider !== 'mock';
    const hasKey = Boolean(e.maskedApiKey && e.maskedApiKey.trim().length > 0);
    return inScope && requiresExternalKey && !hasKey;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          const resp = await fetch('/api/assets/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, dataUrl }),
          });
          const data = await resp.json();
          const uploadedAsset = data.attachment || data.asset;
          if (resp.ok && data.ok && uploadedAsset) {
            setAttachments((prev) => [...prev, uploadedAsset]);
            setLibraryAssets((prev) => [uploadedAsset, ...prev]);
            if (uploadedAsset.type === 'video') setIncludeVideo(true);
            continue;
          }
        } catch {
          // Fallback local preview if backend offline
        }

        const localAsset: TaskAttachment = {
          id: `${Date.now()}_${file.name}`,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          url: dataUrl,
          path: `assets/${file.name}`,
        };
        setAttachments((prev) => [...prev, localAsset]);
        if (isVideo) setIncludeVideo(true);
      }
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddMediaByUrl = () => {
    const trimmed = mediaUrlInput.trim();
    if (!trimmed) return;
    const isVideo = /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(trimmed) || trimmed.includes('video');
    const fileName = trimmed.split('/').pop()?.split('?')[0] || (isVideo ? 'video_clip.mp4' : 'product_image.png');
    const newAsset: TaskAttachment = {
      id: `${Date.now()}_${fileName}`,
      name: fileName,
      type: isVideo ? 'video' : 'image',
      url: trimmed.startsWith('assets/') ? `/${trimmed}` : trimmed,
      path: trimmed.startsWith('assets/') ? trimmed : `assets/${fileName}`,
    };
    setAttachments((prev) => [...prev, newAsset]);
    if (isVideo) setIncludeVideo(true);
    setMediaUrlInput('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleLibraryAsset = (asset: TaskAttachment) => {
    const exists = attachments.some((a) => a.id === asset.id);
    if (exists) {
      setAttachments((prev) => prev.filter((a) => a.id !== asset.id));
    } else {
      setAttachments((prev) => [...prev, asset]);
      if (asset.type === 'video') setIncludeVideo(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (!prompt.trim()) {
        const emptyErr = {
          code: 'ERR_EMPTY_PROMPT',
          stage: 'Khâu 0 — Tiếp nhận lệnh CEO (CEO HQ)',
          message:
            lang === 'vi'
              ? 'Chưa nhập nội dung yêu cầu chiến dịch (Prompt đang trống). Vui lòng nhập yêu cầu trước khi gửi lệnh.'
              : 'Campaign brief prompt is empty. Please enter instructions before dispatching.',
        };
        setFormError(emptyErr);
        pinError({
          stage: emptyErr.stage,
          departmentId: 'MKT-DIRECTOR',
          errorCode: emptyErr.code,
          message: emptyErr.message,
        });
        return;
      }

      const result = await dispatchCeoTask({
        prompt: prompt.trim(),
        targetDepartment,
        priority,
        includeVideo,
        attachments,
        campaignContextId: selectedCampaignContextId,
      });

      if (!result.ok) {
        setFormError({
          code: result.errorCode || 'ERR_DISPATCH_FAILED',
          stage: 'Khâu Khởi Tạo Chiến Dịch (CEO HQ)',
          message: result.errorMessage || 'Không thể khởi tạo task.',
        });
      }
    } catch (err: any) {
      const code = err?.code || 'ERR_UNEXPECTED_DISPATCH';
      const stage = err?.stage || 'Khâu Gửi Lệnh CEO (CEO HQ)';
      const message = err?.message || 'Lỗi không xác định khi gửi yêu cầu.';
      setFormError({ code, stage, message });
      pinError({
        stage,
        departmentId: 'MKT-DIRECTOR',
        errorCode: code,
        message,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CEO Command Center Task Dispatch"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
    >
      <div className="glass-panel rounded-2xl w-full max-w-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/20 border border-[#22C55E] flex items-center justify-center text-[#22C55E]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'vi'
                  ? 'TRỤ SỞ TRUNG TÂM CEO HQ — GIAO NHIỆM VỤ CHIẾN DỊCH'
                  : 'CEO HQ COMMAND CENTER — DISPATCH CAMPAIGN TASK'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'vi'
                  ? 'MKT-DIRECTOR sẽ phân tích brief + Hình ảnh/Video đính kèm, kích hoạt quy trình 8 bước và xuất 9 Sheets TSV.'
                  : 'MKT-DIRECTOR will parse the brief + attached Images/Videos, run the 8-step workflow and generate 9 Sheets TSV.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCeoTaskModalOpen(false)}
            aria-label="Close CEO Task Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Task Dispatch Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-950/90 border border-red-500/80 text-red-100 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-500/30 border border-red-400 font-mono text-[10px] font-bold text-red-200 flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        MÃ LỖI: {formError.code}
                      </span>
                      <span className="text-[11px] font-bold text-amber-300">{formError.stage}</span>
                    </div>
                    <p className="text-red-200 leading-relaxed">{formError.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormError(null)}
                  className="text-red-300 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {missingKeyEmployees.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 font-mono text-[10px] font-bold text-amber-300">
                      CẢNH BÁO: ERR_MISSING_API_KEY ({missingKeyEmployees.length} nhân sự)
                    </span>
                    <span className="font-semibold text-white">
                      Một số nhân viên đang chọn provider ngoài (OpenAI / DeepSeek / Anthropic) nhưng chưa nhập API Key:
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 font-mono">
                    {missingKeyEmployees
                      .map((e) => `${e.name} [${e.departmentId} • ${e.provider}/${e.model}]`)
                      .join(' | ')}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Khi gửi lệnh, hệ thống sẽ tự động bắt lỗi <code className="text-red-300">try-catch</code> ở đúng khâu của phòng ban đó và ghim mã lỗi <code className="text-red-300">ERR_MISSING_API_KEY</code> lên màn hình.
                  </p>
                </div>
              </div>
            )}

            {/* BỐI CẢNH CUỘC TRÒ CHUYỆN (CHIẾN LƯỢC MỚI / MÃ CHIẾN DỊCH CŨ) */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/90 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>
                    {lang === 'vi'
                      ? 'Bối cảnh cuộc trò chuyện (Chiến lược mới / Tiếp tục Mã Chiến Dịch):'
                      : 'Conversation Context (New Strategy / Continue Campaign ID):'}
                  </span>
                </label>
                {selectedCampaignContextId !== 'NEW_CAMPAIGN' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCampaignContextId('NEW_CAMPAIGN')}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-[10px] font-bold text-emerald-300 cursor-pointer"
                  >
                    + Chiến lược mới
                  </button>
                )}
              </div>
              <select
                value={selectedCampaignContextId}
                onChange={(e) => setSelectedCampaignContextId(e.target.value)}
                aria-label="Conversation Context Selector"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#22C55E] cursor-pointer"
              >
                <option value="NEW_CAMPAIGN">
                  ➕ Chiến lược mới (Tạo cuộc hội thoại & Mã chiến dịch mới)
                </option>
                {threadList.map((thread) => (
                  <option key={thread.taskId} value={thread.taskId}>
                    📌 {thread.taskId} (v{thread.revision}) — {thread.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                {selectedCampaignContextId === 'NEW_CAMPAIGN'
                  ? 'Hệ thống sẽ khởi tạo một Mã Chiến Dịch (Ma_Chien_Dich) hoàn toàn mới, phân tích nội dung mới và render 4 poster thiết kế mới.'
                  : `Đang tiếp tục hội thoại trong chiến dịch [${selectedCampaignContextId}]. Yêu cầu mới sẽ cập nhật nội dung, render lại bộ poster và đồng bộ phiên bản tiếp theo.`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                {lang === 'vi'
                  ? 'Nội dung yêu cầu của CEO (Mục tiêu, Sản phẩm, Dịp, Kênh, Ngân sách, Deadline):'
                  : 'CEO Campaign Brief (Goal, Product, Occasion, Channels, Budget, Deadline):'}
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder={
                  selectedCampaignContextId === 'NEW_CAMPAIGN'
                    ? lang === 'vi'
                      ? 'Nhập yêu cầu chiến lược mới (VD: Lên chiến dịch ra mắt Vợt Pickleball VENDY vào dịp Valentine)...'
                      : 'Enter new campaign strategy brief...'
                    : `Nhập yêu cầu bổ sung hoặc chỉnh sửa cho chiến dịch ${selectedCampaignContextId}...`
                }
                className="w-full rounded-xl bg-slate-900/95 border border-slate-700 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            {/* MEDIA INPUT SECTION: HÌNH ẢNH & VIDEO ĐÍNH KÈM CỦA CEO */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/90 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#22C55E]" />
                  <span>
                    {lang === 'vi'
                      ? `Tài nguyên Hình ảnh & Video sản phẩm gốc từ CEO (${attachments.length})`
                      : `CEO Original Product Images & Videos (${attachments.length})`}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {/* Hidden file input for local upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border border-[#22C55E]/50 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingMedia
                        ? lang === 'vi'
                          ? 'Đang tải lên...'
                          : 'Uploading...'
                        : lang === 'vi'
                        ? 'Tải Ảnh / Video từ máy'
                        : 'Upload Image / Video'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAssetPicker(!showAssetPicker)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {lang === 'vi' ? 'Chọn từ thư mục assets/' : 'Pick from assets/'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Paste URL or relative path */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  placeholder={
                    lang === 'vi'
                      ? 'Hoặc dán đường dẫn file / link ảnh hoặc video (VD: assets/vendy_super_power_original.png, https://.../*.mp4)'
                      : 'Or paste image/video path or URL (e.g., assets/vendy_super_power_original.png)'
                  }
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22C55E]"
                />
                <button
                  type="button"
                  onClick={handleAddMediaByUrl}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>{lang === 'vi' ? 'Đính kèm' : 'Attach'}</span>
                </button>
              </div>

              {/* Library Picker Drawer from assets/ */}
              {showAssetPicker && (
                <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {lang === 'vi'
                        ? 'Kho tư liệu có sẵn trong dự án (assets/):'
                        : 'Available project media in assets/:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAssetPicker(false)}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {lang === 'vi' ? 'Thu gọn' : 'Close'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                    {libraryAssets.map((asset) => {
                      const selected = attachments.some((a) => a.id === asset.id);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => handleToggleLibraryAsset(asset)}
                          className={`group relative rounded-lg overflow-hidden border p-1.5 cursor-pointer transition flex flex-col gap-1 ${
                            selected
                              ? 'border-[#22C55E] bg-emerald-950/40 ring-1 ring-[#22C55E]'
                              : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                          }`}
                        >
                          <div className="h-16 w-full rounded bg-slate-950 overflow-hidden flex items-center justify-center relative">
                            {asset.type === 'video' ? (
                              <video src={asset.url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img
                                src={asset.url}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white flex items-center gap-1">
                              {asset.type === 'video' ? (
                                <Film className="w-2.5 h-2.5 text-amber-400" />
                              ) : (
                                <ImageIcon className="w-2.5 h-2.5 text-[#22C55E]" />
                              )}
                              {asset.type.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-200 truncate font-mono">{asset.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attached Media Preview Strip */}
              {attachments.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-400 border border-dashed border-slate-700 rounded-lg">
                  {lang === 'vi'
                    ? 'Chưa có hình ảnh hoặc video đính kèm. Hãy tải lên hoặc chọn từ thư mục assets/ để phòng DESIGN & VIDEO xử lý.'
                    : 'No images or videos attached yet. Upload or pick from assets/ for DESIGN & VIDEO departments.'}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group shrink-0 w-40 rounded-xl bg-slate-950 border border-slate-700 p-1.5 flex items-center gap-2"
                    >
                      <div className="w-11 h-11 rounded-lg bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center border border-slate-800">
                        {att.type === 'video' ? (
                          <video src={att.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            att.type === 'video'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-[#22C55E]'
                          }`}
                        >
                          {att.type === 'video' ? (
                            <Film className="w-2.5 h-2.5" />
                          ) : (
                            <ImageIcon className="w-2.5 h-2.5" />
                          )}
                          {att.type.toUpperCase()}
                        </span>
                        <p className="text-[10px] text-white font-medium truncate mt-0.5">{att.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">{att.path}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        aria-label={`Remove ${att.name}`}
                        className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Target Department */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {lang === 'vi' ? 'Phòng ban đích' : 'Target Department'}
                </label>
                <select
                  aria-label="Select Target Department"
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value as any)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="AUTO">
                    {lang === 'vi'
                      ? '⚡ Tự phân bổ (Quy trình 8 bước)'
                      : '⚡ Auto-Orchestrate (8-Step Workflow)'}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.shortName} — {lang === 'vi' ? d.roleVi : d.roleEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {lang === 'vi' ? 'Độ ưu tiên' : 'Priority'}
                </label>
                <select
                  aria-label="Select Task Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="Cao">{lang === 'vi' ? '🔥 Cao (Khẩn cấp)' : '🔥 High'}</option>
                  <option value="Trung bình">{lang === 'vi' ? '⚡ Trung bình' : '⚡ Medium'}</option>
                  <option value="Thấp">{lang === 'vi' ? '🌱 Thấp' : '🌱 Low'}</option>
                </select>
              </div>

              {/* Video Quota Policy Toggle */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {lang === 'vi' ? 'Phòng VIDEO (Quota Policy)' : 'VIDEO Dept (Quota Guard)'}
                </label>
                <button
                  type="button"
                  onClick={() => setIncludeVideo(!includeVideo)}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    includeVideo
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>
                    {includeVideo
                      ? lang === 'vi'
                        ? 'Bật 5 nhân sự VIDEO'
                        : 'Activate 5 VIDEO Agents'
                      : lang === 'vi'
                      ? 'Tắt (Tiết kiệm Quota)'
                      : 'Standby (Save Quota)'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCeoTaskModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {lang === 'vi' ? 'Đóng' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {lang === 'vi' ? 'Gửi Lệnh & Kích Hoạt AI' : 'Dispatch Task to AI Agents'}
                </span>
              </button>
            </div>
          </form>

          {/* Recent Task History */}
          <div className="border-t border-slate-800 pt-4 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>{lang === 'vi' ? 'Lịch sử chiến dịch & Task gần đây' : 'Recent Campaign & Task History'}</span>
            </h3>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#22C55E]">{t.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {t.targetDepartment === 'AUTO' ? '8-Step Auto' : t.targetDepartment}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                        {t.priority}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {t.status} ({t.progress}%)
                    </span>
                  </div>

                  <p className="text-xs text-slate-200">{t.prompt}</p>

                  {t.attachments && t.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {t.attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-emerald-300 font-mono border border-slate-700"
                        >
                          {att.type === 'video' ? (
                            <Film className="w-2.5 h-2.5 text-amber-400" />
                          ) : (
                            <ImageIcon className="w-2.5 h-2.5 text-[#22C55E]" />
                          )}
                          {att.path}
                        </span>
                      ))}
                    </div>
                  )}

                  {t.summary && (
                    <p className="text-[11px] text-emerald-300/90 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      {t.summary}
                    </p>
                  )}

                  {t.stepLogs.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                      {t.stepLogs.slice(-3).map((log, index) => (
                        <div key={index}>• {log}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
