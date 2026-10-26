import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Film,
  FolderGit2,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Paperclip,
  PlusCircle,
  Send,
  Sparkles,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { CeoAttachmentItem, SheetTableData } from '../../types/company';

const SheetViewerTabs: React.FC<{
  sheets: SheetTableData[];
  visualAssets?: { code: string; title: string; url: string; filePath?: string; ratio: string }[];
}> = ({ sheets, visualAssets = [] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentSheet = sheets[activeIdx] || sheets[0];
  if (!currentSheet) return null;

  const handleCopyTsv = () => {
    const lines = [
      currentSheet.headers.join('\t'),
      ...currentSheet.rows.map((r) => r.join('\t')),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Tìm danh sách URL ảnh xuất hiện trong 1 ô của Sheet (theo mã DES-01..04 hoặc đường dẫn assets/...)
  const extractCellImages = (cellText: string): { label: string; url: string }[] => {
    if (!cellText || typeof cellText !== 'string') return [];
    const found: { label: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    // 1. Khớp theo mã thiết kế DES-01..04 từ visualAssets vừa tạo
    for (const v of visualAssets) {
      if (
        cellText.includes(v.code) ||
        (v.filePath && cellText.includes(v.filePath))
      ) {
        if (!seenUrls.has(v.url)) {
          seenUrls.add(v.url);
          found.push({ label: v.code, url: v.url });
        }
      }
    }

    // 2. Khớp theo đường dẫn assets/...(png|jpg|jpeg|webp)
    const regex = /(assets\/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp))/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cellText)) !== null) {
      const relPath = match[1];
      const matchedVisual = visualAssets.find(
        (v) => v.filePath === relPath || v.url.endsWith(relPath)
      );
      const url = matchedVisual ? matchedVisual.url : `/${relPath.replace(/^\/+/, '')}`;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        found.push({ label: relPath.split('/').pop() || relPath, url });
      }
    }

    return found;
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-950/90 overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-1" />
          {sheets.map((s, idx) => (
            <button
              key={s.sheetName}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold whitespace-nowrap transition cursor-pointer ${
                idx === activeIdx
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              {sheets.length > 1 ? `${idx + 1}. ` : ''}
              {s.sheetName}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCopyTsv}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold shrink-0 transition cursor-pointer"
          title="Copy chuẩn TSV để dán vào Google Sheets"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Đã Copy TSV</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy TSV</span>
            </>
          )}
        </button>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900/70 text-slate-300 border-b border-slate-800">
              {currentSheet.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-2.5 py-1.5 font-mono font-semibold text-emerald-300/90 whitespace-nowrap border-r border-slate-800/70 last:border-r-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentSheet.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-slate-800/50 last:border-b-0 hover:bg-slate-900/40"
              >
                {row.map((cell, cIdx) => {
                  const cellImages = extractCellImages(cell);
                  return (
                    <td
                      key={cIdx}
                      className="px-2.5 py-1.5 text-slate-300 align-top border-r border-slate-800/40 last:border-r-0 min-w-[110px] max-w-[300px] break-words"
                    >
                      <div>{cell}</div>
                      {cellImages.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {cellImages.map((img, i) => (
                            <a
                              key={i}
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 transition"
                              title={`Xem ảnh: ${img.label}`}
                            >
                              <img
                                src={img.url}
                                alt={img.label}
                                className="w-10 h-10 rounded object-cover bg-slate-950 shrink-0"
                              />
                              <span className="text-[9px] font-mono text-emerald-300 max-w-[110px] truncate">
                                {img.label}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const LiveAgentChatPanel: React.FC = () => {
  const {
    lang,
    isChatPanelOpen,
    setChatPanelOpen,
    chatMessages,
    clearChatMessages,
    activeTaskId,
    dispatchCeoTask,
    selectedCampaignContextId,
    setSelectedCampaignContextId,
    campaignThreads,
  } = useCompanyStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [includeVideo, setIncludeVideo] = useState(false);
  const [attachments, setAttachments] = useState<CeoAttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const feedEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const threadList = Object.values(campaignThreads);
  const isNewStrategyMode = selectedCampaignContextId === 'NEW_CAMPAIGN';
  const activeThread = !isNewStrategyMode
    ? campaignThreads[selectedCampaignContextId]
    : undefined;

  useEffect(() => {
    if (isChatPanelOpen) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatPanelOpen, selectedCampaignContextId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    const added: CeoAttachmentItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          const resp = await fetch('/api/assets/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type,
              dataUrl,
            }),
          });
          const data = await resp.json();
          if (resp.ok && data.ok && data.attachment) {
            added.push(data.attachment);
            continue;
          }
        } catch {
          // fallback local preview
        }

        added.push({
          id: `ATT-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          mimeType: file.type,
          size: file.size,
          url: dataUrl,
          path: `assets/ceo_uploads/${file.name}`,
        });
      } catch {
        // ignore read error
      }
    }

    if (added.some((a) => a.type === 'video')) {
      setIncludeVideo(true);
    }
    setAttachments((prev) => [...prev, ...added]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim()) return;

    const currentPrompt = inputPrompt;
    const currentAtt = [...attachments];
    const currentVideo = includeVideo;
    const currentContext = selectedCampaignContextId;

    setInputPrompt('');
    setAttachments([]);

    await dispatchCeoTask({
      prompt: currentPrompt,
      targetDepartment: 'AUTO',
      priority: 'Cao',
      includeVideo: currentVideo,
      attachments: currentAtt,
      campaignContextId: currentContext,
    });
  };

  // Khi thu gọn: Hiển thị nút nổi bên phải màn hình để mở khung Chat bất cứ lúc nào
  if (!isChatPanelOpen) {
    return (
      <button
        type="button"
        onClick={() => setChatPanelOpen(true)}
        className="fixed right-4 bottom-24 z-30 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-white border border-emerald-500/50 shadow-2xl shadow-emerald-950/60 backdrop-blur-md transition cursor-pointer group"
      >
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
          <MessageSquare className="w-4 h-4" />
          {activeTaskId && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <span>{lang === 'vi' ? 'Ô Chat Điều Phối 9 Phòng Ban' : 'Live 9-Dept Agent Chat'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-mono text-emerald-300">
              {chatMessages.length}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {activeTaskId
              ? `⚡ Đang chạy ${activeTaskId}...`
              : lang === 'vi'
              ? 'Giao việc & xem trực tiếp 9 Sheets TSV'
              : 'Chat & view live 9 Sheets TSV'}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
      </button>
    );
  }

  return (
    <aside
      className={`fixed right-4 top-20 bottom-20 z-30 flex flex-col rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200 ${
        isExpanded ? 'w-[880px] max-w-[calc(100vw-2rem)]' : 'w-[520px] max-w-[calc(100vw-2rem)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-950/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white truncate">
                {lang === 'vi'
                  ? 'KHUNG CHAT MULTI-AGENT & 9 SHEETS TRỰC TIẾP'
                  : 'LIVE MULTI-AGENT CHAT & 9-SHEETS WORKSPACE'}
              </h3>
              {activeTaskId ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  {activeTaskId}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ONLINE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {lang === 'vi'
                ? 'Tự động điều phối 8 bước • Xuất 9 Sheets TSV • Kết xuất 4 Poster MỚI & Đồng bộ Google Sheet'
                : '8-step workflow • 9 TSV Sheets • Render 4 NEW posters & Google Sheet sync'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href="https://docs.google.com/spreadsheets/d/19oW1jOHOw81LpSLwhDWWHY7Cz91BJkjT5WUhBGaekXc/edit"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition"
            title="Mở Google Sheet BaoNguyn-Company"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Sheet</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Thu hẹp khung chat' : 'Mở rộng xem bảng 9 Sheets'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={clearChatMessages}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Về chế độ Chiến lược mới"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setChatPanelOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Thu gọn khung chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Campaign Context Selector Bar (Chọn Chiến Lược Mới hoặc Tiếp Tục trong Mã Chiến Dịch) */}
      <div className="px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {lang === 'vi' ? 'BỐI CẢNH CUỘC TRÒ CHUYỆN:' : 'CONVERSATION CONTEXT:'}
            </span>
          </div>

          {!isNewStrategyMode && (
            <button
              type="button"
              onClick={() => setSelectedCampaignContextId('NEW_CAMPAIGN')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer"
              title="Bắt đầu một chiến lược và mã chiến dịch hoàn toàn mới"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+ Chiến lược mới</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Chọn bối cảnh chiến dịch"
            value={selectedCampaignContextId}
            onChange={(e) => setSelectedCampaignContextId(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none cursor-pointer transition ${
              isNewStrategyMode
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 focus:border-emerald-400'
                : 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200 focus:border-indigo-400'
            }`}
          >
            <option value="NEW_CAMPAIGN" className="bg-slate-900 text-emerald-300 font-bold">
              ➕ Chiến lược mới (Tạo cuộc hội thoại & Mã chiến dịch mới)
            </option>
            {threadList.length > 0 && (
              <optgroup
                label="📂 Tiếp tục trò chuyện trong Mã Chiến Dịch đã có:"
                className="bg-slate-900 text-slate-300"
              >
                {threadList.map((th) => (
                  <option
                    key={th.taskId}
                    value={th.taskId}
                    className="bg-slate-900 text-white font-mono"
                  >
                    📌 {th.taskId} (v{th.revision}) — {th.title.slice(0, 52)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Status hint under dropdown */}
        <div className="text-[10px] flex items-center justify-between px-1">
          {isNewStrategyMode ? (
            <span className="text-emerald-400/90">
              ✦ Đang chọn <strong>Chiến lược mới</strong>: Mỗi yêu cầu gửi đi sẽ tạo một{' '}
              <code className="font-mono">Ma_Chien_Dich</code> mới & kết xuất 4 Poster mới.
            </span>
          ) : (
            <span className="text-indigo-300">
              ✦ Đang tiếp tục trong <strong className="font-mono">{selectedCampaignContextId}</strong>{' '}
              ({activeThread?.occasionName || 'Chiến dịch đang chọn'} • Phiên bản v
              {activeThread?.revision || 1}).
            </span>
          )}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {chatMessages.map((msg) => {
          const isCeo = msg.senderRole === 'CEO';
          const isError = msg.status === 'error';
          const isWorking = msg.status === 'working';

          return (
            <div
              key={msg.id}
              className={`rounded-2xl p-3.5 border transition ${
                isCeo
                  ? 'bg-emerald-950/40 border-emerald-500/40 ml-6'
                  : isError
                  ? 'bg-rose-950/40 border-rose-500/60'
                  : 'bg-slate-800/75 border-slate-700/70'
              }`}
            >
              {/* Message Top Meta */}
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: msg.avatarColor || '#10B981' }}
                  >
                    {isCeo ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-bold text-white truncate">{msg.senderName}</span>
                  {msg.providerModel && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                      {msg.providerModel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {msg.stepBadge && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-slate-300">
                      {msg.stepBadge}
                    </span>
                  )}
                  {isWorking && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ĐANG LÀM
                    </span>
                  )}
                  {isError && msg.errorCode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      {msg.errorCode}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
              </div>

              {/* Message Content */}
              <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                {msg.content}
              </div>

              {/* CEO Attachments Preview */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80"
                    >
                      {att.type === 'image' ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-12 h-12 rounded object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-amber-500/20 flex items-center justify-center text-amber-300">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                      <div className="text-[10px] pr-1">
                        <div className="font-semibold text-slate-200 truncate max-w-[140px]">
                          {att.name}
                        </div>
                        <div className="text-slate-400 font-mono">{att.path}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rendered Visual Assets (DES-01..04) */}
              {msg.visualAssets && msg.visualAssets.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-bold text-pink-300 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>
                      04 ẤN PHẨM THIẾT KẾ MỚI ĐÃ KẾT XUẤT RIÊNG CHO {msg.taskId} TẠI ASSETS/:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {msg.visualAssets.map((asset) => (
                      <a
                        key={asset.code}
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950/90 hover:border-pink-500/50 transition block"
                      >
                        <div className="aspect-square w-full bg-slate-900 overflow-hidden">
                          <img
                            src={asset.url}
                            alt={asset.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="p-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-pink-400">{asset.code}</span>
                            <span className="text-slate-400">{asset.ratio}</span>
                          </div>
                          <div className="text-[10px] text-slate-200 truncate mt-0.5 font-medium">
                            {asset.title}
                          </div>
                          {asset.filePath && (
                            <div className="text-[9px] text-emerald-400/90 font-mono truncate mt-0.5">
                              {asset.filePath}
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Embedded TSV Sheets Viewer */}
              {msg.sheets && msg.sheets.length > 0 && (
                <SheetViewerTabs sheets={msg.sheets} visualAssets={msg.visualAssets} />
              )}

              {/* 5-Line CEO Summary Box */}
              {msg.ceoSummaryLines && msg.ceoSummaryLines.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
                  <div className="text-[11px] font-bold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>TÓM TẮT CHO CEO (TỐI ĐA 5 DÒNG):</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-emerald-100/95">
                    {msg.ceoSummaryLines.map((line, i) => (
                      <div key={i} className="leading-relaxed">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Report File & Google Sheet Sync Footer */}
              {msg.reportFile && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/70 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>File báo cáo:</span>
                    <span className="text-emerald-300 font-semibold">{msg.reportFile}</span>
                    {msg.syncedToSheet && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-bold">
                        ✓ Đã đồng bộ Google Sheet
                      </span>
                    )}
                  </div>
                  {msg.sheetUrl && (
                    <a
                      href={msg.sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition"
                    >
                      <span>Mở Google Sheet BaoNguyn-Company</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={feedEndRef} />
      </div>

      {/* Bottom Chat Input Bar */}
      <form
        onSubmit={handleSendChat}
        className="p-3 bg-slate-950/95 border-t border-slate-800 space-y-2"
      >
        {/* Attachment Previews before sending */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-200 shrink-0"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Film className="w-3 h-3 text-amber-400" />
                )}
                <span className="max-w-[110px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                  className="text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer shrink-0"
            title="Đính kèm Hình ảnh / Video gốc của CEO"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIncludeVideo(!includeVideo)}
            className={`px-2.5 py-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
              includeVideo
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Bật/Tắt kích hoạt phòng VIDEO (Tối ưu Quota)"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{includeVideo ? 'VIDEO: ON' : 'VIDEO: OFF'}</span>
          </button>

          <textarea
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            placeholder={
              isNewStrategyMode
                ? 'Nhập yêu cầu để khởi tạo CHIẾN LƯỢC MỚI (Tạo Mã chiến dịch mới & 4 Poster mới)...'
                : `Nhập yêu cầu tiếp theo để cập nhật trong mã chiến dịch ${selectedCampaignContextId}...`
            }
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold transition cursor-pointer shrink-0"
            title={
              isNewStrategyMode
                ? 'Khởi tạo chiến lược mới'
                : `Gửi cập nhật trong chiến dịch ${selectedCampaignContextId}`
            }
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
