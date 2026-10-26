import { create } from 'zustand';
import {
  CampaignContextThread,
  ChatMessageItem,
  DepartmentBuilding,
  DepartmentId,
  Employee,
  EmployeeState,
  formatProviderModel,
  getValidModelForProvider,
  LLMProvider,
  PinnedErrorAlert,
  SkillItem,
  TaskAttachment,
  TaskRecord,
} from '../types/company';
import {
  CANTEEN_POSITION,
  IDLE_CHAT_DIALOGUES_EN,
  IDLE_CHAT_DIALOGUES_VI,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_SKILLS,
  INITIAL_TASKS,
} from '../data/mockCompanyData';
import { buildCampaignPackage } from '../utils/campaignGenerator';
import { generateCampaignPosters } from '../utils/posterCanvasGenerator';

const NEW_CAMPAIGN_WELCOME_MSG: ChatMessageItem = {
  id: 'welcome-new-campaign',
  taskId: 'NEW_CAMPAIGN',
  senderRole: 'MKT-DIRECTOR',
  senderName: 'Director-01 (Phòng Điều Phối Marketing)',
  avatarColor: '#22C55E',
  providerModel: 'ANTIGRAVITY / pro',
  stepBadge: '➕ CHIẾN LƯỢC MỚI • TẠO MÃ CHIẾN DỊCH MỚI',
  content:
    'Xin chào CEO! Bạn đang ở chế độ **"➕ Chiến lược mới"**.\n- Khi gửi yêu cầu tại đây, hệ thống sẽ khởi tạo một **Mã chiến dịch mới (`MKT-YYYYMMDD-###`)**, xây dựng chiến lược riêng biệt, kết xuất **04 ấn phẩm thiết kế MỚI hoàn toàn** vào `assets/` và xuất 9 Sheets TSV.\n- Nếu muốn tiếp tục trao đổi hoặc chỉnh sửa một chiến dịch đã có, hãy chọn **`Ma_Chien_Dich`** tương ứng ở thanh Dropdown phía trên!',
  timestamp: 'Sẵn sàng',
  status: 'completed',
};

function createInitialCampaignThreads(): Record<string, CampaignContextThread> {
  const threads: Record<string, CampaignContextThread> = {};
  for (const t of INITIAL_TASKS) {
    const pkg = buildCampaignPackage({
      taskId: t.id,
      revision: 1,
      promptHistory: [t.prompt],
      priority: t.priority,
      includeVideo: /video|clip/i.test(t.prompt),
      attachments: t.attachments || [],
    });
    threads[t.id] = {
      taskId: t.id,
      title: pkg.campaignTitle,
      occasionName: pkg.occasionName,
      createdAt: t.createdAt,
      revision: 1,
      promptHistory: [t.prompt],
      attachments: t.attachments || [],
      includeVideo: /video|clip/i.test(t.prompt),
      messages: [
        {
          id: `init-ceo-${t.id}`,
          taskId: t.id,
          senderRole: 'CEO',
          senderName: 'CEO (Bạn)',
          avatarColor: '#10B981',
          stepBadge: `YÊU CẦU GỐC • ${t.id}`,
          content: t.prompt,
          timestamp: t.createdAt,
          status: 'completed',
        },
        {
          id: `init-final-${t.id}`,
          taskId: t.id,
          senderRole: 'MKT-DIRECTOR',
          senderName: 'Director-01 — BÁO CÁO 9 SHEETS CHIẾN DỊCH',
          avatarColor: '#22C55E',
          providerModel: 'ANTIGRAVITY / pro',
          stepBadge: `ĐÃ DUYỆT • ${t.id} • v1`,
          content: `📌 Bạn đang xem lại bối cảnh chiến dịch **${t.id}** (*${pkg.campaignTitle}*).\nHãy nhập yêu cầu tiếp theo ở ô chat bên dưới nếu bạn muốn **cập nhật ưu đãi, chỉnh sửa nội dung, bổ sung giá bán lẻ hoặc yêu cầu làm thêm kịch bản Video** trong mã chiến dịch **${t.id}** này!`,
          timestamp: t.completedAt || t.createdAt,
          status: 'completed',
          sheets: pkg.allNineSheets,
          ceoSummaryLines: pkg.ceoSummaryLines,
          reportFile: `reports/${t.id}.md`,
          sheetUrl:
            'https://docs.google.com/spreadsheets/d/19oW1jOHOw81LpSLwhDWWHY7Cz91BJkjT5WUhBGaekXc/edit',
          syncedToSheet: true,
        },
      ],
    };
  }
  return threads;
}

class PipelineStageError extends Error {
  code: string;
  stage: string;
  departmentId?: DepartmentId;
  employeeId?: string;
  employeeName?: string;
  provider?: LLMProvider;
  model?: string;

  constructor(params: {
    code: string;
    message: string;
    stage: string;
    departmentId?: DepartmentId;
    employeeId?: string;
    employeeName?: string;
    provider?: LLMProvider;
    model?: string;
  }) {
    super(params.message);
    this.name = 'PipelineStageError';
    this.code = params.code;
    this.stage = params.stage;
    this.departmentId = params.departmentId;
    this.employeeId = params.employeeId;
    this.employeeName = params.employeeName;
    this.provider = params.provider;
    this.model = params.model;
  }
}

interface CompanyStore {
  lang: 'vi' | 'en';
  setLang: (lang: 'vi' | 'en') => void;

  // Performance & Simulation Controls
  lowQuality: boolean;
  setLowQuality: (low: boolean) => void;
  autonomousMode: boolean;
  setAutonomousMode: (enabled: boolean) => void;
  costLimitUsd: number;
  setCostLimitUsd: (limit: number) => void;
  currentSessionCostUsd: number;

  // Camera Focus & Modals
  cameraTarget: [number, number, number];
  setCameraTarget: (target: [number, number, number]) => void;
  selectedDepartmentId: DepartmentId | null;
  setSelectedDepartmentId: (id: DepartmentId | null) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  isDetailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;
  isCeoTaskModalOpen: boolean;
  setCeoTaskModalOpen: (open: boolean) => void;
  isChatPanelOpen: boolean;
  setChatPanelOpen: (open: boolean) => void;

  // Conversation Context (NEW_CAMPAIGN vs specific Ma_Chien_Dich)
  selectedCampaignContextId: 'NEW_CAMPAIGN' | string;
  setSelectedCampaignContextId: (contextId: 'NEW_CAMPAIGN' | string) => void;
  campaignThreads: Record<string, CampaignContextThread>;

  // Live Multi-Agent Chat & 9-Sheets Workspace Stream
  chatMessages: ChatMessageItem[];
  clearChatMessages: () => void;

  // Core Entities
  departments: DepartmentBuilding[];
  employees: Employee[];
  globalSkills: SkillItem[];
  tasks: TaskRecord[];
  activeTaskId: string | null;

  // Pinned Error Alerts (Ghim lỗi theo từng khâu kèm mã lỗi)
  pinnedErrors: PinnedErrorAlert[];
  pinError: (err: Omit<PinnedErrorAlert, 'id' | 'timestamp'>) => void;
  dismissPinnedError: (id: string) => void;
  clearPinnedErrors: () => void;
  quickFixErrorToAntigravity: (errorId: string) => void;

  // Bottom bar filter
  departmentFilter: DepartmentId | 'ALL';
  setDepartmentFilter: (dept: DepartmentId | 'ALL') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Actions
  focusOnDepartment: (id: DepartmentId) => void;
  focusOnEmployee: (id: string, openPanel?: boolean) => void;
  toggleEmployeeEnabled: (employeeId: string) => void;
  updateEmployeeConfig: (
    employeeId: string,
    updates: Partial<Pick<Employee, 'provider' | 'model' | 'maskedApiKey' | 'baseUrl' | 'temperature' | 'maxTokens' | 'systemPrompt' | 'memoryNotes' | 'tools' | 'permissions' | 'enabled'>>
  ) => void;
  toggleEmployeeSkill: (employeeId: string, skillId: string) => void;
  addGlobalSkill: (skill: SkillItem, targetEmployeeId?: string) => void;
  setEmployeeError: (employeeId: string, errorText?: string, errorCode?: string) => void;
  retryDepartmentTask: (deptId: DepartmentId) => void;

  // Task Orchestration & Autonomous Simulation Tick
  dispatchCeoTask: (payload: {
    prompt: string;
    targetDepartment: DepartmentId | 'AUTO';
    priority: 'Cao' | 'Trung bình' | 'Thấp';
    includeVideo: boolean;
    attachments?: TaskAttachment[];
    campaignContextId?: 'NEW_CAMPAIGN' | string;
  }) => Promise<{ ok: boolean; errorCode?: string; errorMessage?: string }>;
  handleSseTaskStep: (data: any) => void;
  handleSseTaskCompleted: (data: any) => void;
  tickAutonomousBehavior: () => void;
  syncFromBackend: () => Promise<void>;
}

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  lang: 'vi',
  setLang: (lang) => set({ lang }),

  lowQuality: false,
  setLowQuality: (lowQuality) => set({ lowQuality }),
  autonomousMode: true,
  setAutonomousMode: (autonomousMode) => set({ autonomousMode }),
  costLimitUsd: 2.5,
  setCostLimitUsd: (costLimitUsd) => set({ costLimitUsd }),
  currentSessionCostUsd: 0.12,

  cameraTarget: [0, 0, 0],
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
  selectedDepartmentId: null,
  setSelectedDepartmentId: (selectedDepartmentId) => set({ selectedDepartmentId }),
  selectedEmployeeId: 'director-01',
  setSelectedEmployeeId: (selectedEmployeeId) => set({ selectedEmployeeId }),
  isDetailPanelOpen: false,
  setDetailPanelOpen: (isDetailPanelOpen) => set({ isDetailPanelOpen }),
  isCeoTaskModalOpen: false,
  setCeoTaskModalOpen: (isCeoTaskModalOpen) => set({ isCeoTaskModalOpen }),
  isChatPanelOpen: false,
  setChatPanelOpen: (isChatPanelOpen) => set({ isChatPanelOpen }),

  selectedCampaignContextId: 'NEW_CAMPAIGN',
  campaignThreads: createInitialCampaignThreads(),
  setSelectedCampaignContextId: (contextId) => {
    set((state) => {
      if (contextId === 'NEW_CAMPAIGN') {
        return {
          selectedCampaignContextId: 'NEW_CAMPAIGN',
          chatMessages: [NEW_CAMPAIGN_WELCOME_MSG],
        };
      }
      const thread = state.campaignThreads[contextId];
      return {
        selectedCampaignContextId: contextId,
        chatMessages: thread ? thread.messages : [NEW_CAMPAIGN_WELCOME_MSG],
      };
    });
  },

  chatMessages: [NEW_CAMPAIGN_WELCOME_MSG],
  clearChatMessages: () =>
    set({
      selectedCampaignContextId: 'NEW_CAMPAIGN',
      chatMessages: [NEW_CAMPAIGN_WELCOME_MSG],
    }),

  departments: INITIAL_DEPARTMENTS,
  employees: INITIAL_EMPLOYEES,
  globalSkills: INITIAL_SKILLS,
  tasks: INITIAL_TASKS,
  activeTaskId: null,

  pinnedErrors: [],
  pinError: (err) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    set((state) => {
      const duplicate = state.pinnedErrors.some(
        (existing) =>
          existing.errorCode === err.errorCode &&
          existing.stage === err.stage &&
          existing.employeeId === err.employeeId &&
          existing.taskId === err.taskId
      );
      if (duplicate) return state;
      const newAlert: PinnedErrorAlert = {
        ...err,
        id: `ERR-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        timestamp: nowStr,
      };
      return {
        pinnedErrors: [newAlert, ...state.pinnedErrors].slice(0, 12),
      };
    });
  },
  dismissPinnedError: (id) => {
    set((state) => ({
      pinnedErrors: state.pinnedErrors.filter((e) => e.id !== id),
    }));
  },
  clearPinnedErrors: () => set({ pinnedErrors: [] }),
  quickFixErrorToAntigravity: (errorId) => {
    const alert = get().pinnedErrors.find((e) => e.id === errorId);
    if (!alert) return;
    if (alert.employeeId) {
      get().updateEmployeeConfig(alert.employeeId, {
        provider: 'antigravity',
        model: 'pro',
      });
      get().setEmployeeError(alert.employeeId, undefined, undefined);
    }
    if (alert.departmentId) {
      get().retryDepartmentTask(alert.departmentId);
    }
    get().dismissPinnedError(errorId);
  },

  departmentFilter: 'ALL',
  setDepartmentFilter: (departmentFilter) => set({ departmentFilter }),
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  focusOnDepartment: (id) => {
    const dept = get().departments.find((d) => d.id === id);
    if (!dept) return;
    set({
      selectedDepartmentId: id,
      cameraTarget: [dept.position[0], 0, dept.position[2]],
      isCeoTaskModalOpen: id === 'MKT-DIRECTOR' ? true : get().isCeoTaskModalOpen,
    });
  },

  focusOnEmployee: (id, openPanel = false) => {
    const emp = get().employees.find((e) => e.id === id);
    if (!emp) return;
    set({
      selectedEmployeeId: id,
      cameraTarget: [emp.position[0], 0, emp.position[2]],
      isDetailPanelOpen: openPanel ? true : get().isDetailPanelOpen,
    });
  },

  toggleEmployeeEnabled: (employeeId) => {
    set((state) => {
      const targetEmp = state.employees.find((e) => e.id === employeeId);
      if (!targetEmp) return state;

      const currentlyEnabled = targetEmp.enabled !== false;
      const nextEnabled = !currentlyEnabled;
      const deptId = targetEmp.departmentId;

      const updatedEmployees = state.employees.map((e) => {
        if (e.id !== employeeId) return e;
        if (!nextEnabled) {
          // Chuyển sang OFF -> Cho nhân viên ra Căng-tin nghỉ ngơi cho đến khi CEO bật ON lại
          return {
            ...e,
            enabled: false,
            state: 'resting' as EmployeeState,
            targetPosition: [
              CANTEEN_POSITION[0] + (Math.random() * 6 - 3),
              0,
              CANTEEN_POSITION[2] + (Math.random() * 3 - 1.5),
            ] as [number, number, number],
            currentTask: undefined,
            taskProgress: 0,
            errorText: undefined,
            errorCode: undefined,
            chatBubble:
              state.lang === 'vi'
                ? '⏸️ Đang tạm nghỉ (OFF) theo lệnh CEO'
                : '⏸️ Off-duty (OFF) by CEO command',
          };
        } else {
          // Chuyển sang ON -> Quay về tòa phòng ban sẵn sàng làm việc
          return {
            ...e,
            enabled: true,
            state: 'idle' as EmployeeState,
            targetPosition: [...e.homePosition] as [number, number, number],
            chatBubble:
              state.lang === 'vi'
                ? '⚡ Đã bật ON — Sẵn sàng nhận việc từ CEO!'
                : '⚡ Back ON — Ready for CEO tasks!',
          };
        }
      });

      // Nếu tắt OFF nhân viên đang bị lỗi thì gỡ luôn lỗi ghim của nhân viên đó
      const updatedPinnedErrors = !nextEnabled
        ? state.pinnedErrors.filter((err) => err.employeeId !== employeeId)
        : state.pinnedErrors;

      // Kiểm tra xem phòng ban của nhân viên đó còn ai bị lỗi không
      const deptStillHasError = updatedEmployees.some(
        (e) => e.departmentId === deptId && e.enabled !== false && Boolean(e.errorText)
      );

      const updatedDepartments = state.departments.map((d) =>
        d.id === deptId && !deptStillHasError && d.status === 'error'
          ? { ...d, status: 'idle' as const, lastErrorCode: undefined, lastErrorStage: undefined }
          : d
      );

      return {
        employees: updatedEmployees,
        pinnedErrors: updatedPinnedErrors,
        departments: updatedDepartments,
      };
    });
  },

  updateEmployeeConfig: (employeeId, updates) => {
    set((state) => ({
      employees: state.employees.map((e) => {
        if (e.id !== employeeId) return e;
        const nextProvider = updates.provider || e.provider;
        const nextModel = getValidModelForProvider(
          nextProvider,
          updates.model !== undefined ? updates.model : e.model
        );
        const clearErr =
          Boolean(updates.maskedApiKey) ||
          nextProvider === 'antigravity' ||
          nextProvider === 'mock';
        return {
          ...e,
          ...updates,
          provider: nextProvider,
          model: nextModel,
          errorText: clearErr ? undefined : e.errorText,
          errorCode: clearErr ? undefined : e.errorCode,
        };
      }),
    }));
  },

  toggleEmployeeSkill: (employeeId, skillId) => {
    set((state) => ({
      employees: state.employees.map((e) => {
        if (e.id !== employeeId) return e;
        return {
          ...e,
          skills: e.skills.map((s) => (s.id === skillId ? { ...s, enabled: !s.enabled } : s)),
        };
      }),
    }));
  },

  addGlobalSkill: (skill, targetEmployeeId) => {
    set((state) => {
      const exists = state.globalSkills.some((s) => s.id === skill.id);
      const updatedGlobal = exists ? state.globalSkills : [...state.globalSkills, skill];
      const updatedEmployees = state.employees.map((emp) => {
        const hasSkill = emp.skills.some((s) => s.id === skill.id);
        const shouldEnable = !targetEmployeeId || emp.id === targetEmployeeId;
        if (hasSkill) {
          return {
            ...emp,
            skills: emp.skills.map((s) => (s.id === skill.id && shouldEnable ? { ...s, enabled: true } : s)),
          };
        }
        return {
          ...emp,
          skills: [...emp.skills, { ...skill, enabled: shouldEnable }],
        };
      });
      return { globalSkills: updatedGlobal, employees: updatedEmployees };
    });
  },

  setEmployeeError: (employeeId, errorText, errorCode) => {
    set((state) => {
      const emp = state.employees.find((e) => e.id === employeeId);
      const deptId = emp?.departmentId;
      return {
        employees: state.employees.map((e) =>
          e.id === employeeId ? { ...e, errorText, errorCode } : e
        ),
        departments: state.departments.map((d) =>
          d.id === deptId
            ? {
                ...d,
                status: errorText ? 'error' : 'idle',
                lastErrorCode: errorCode,
              }
            : d
        ),
      };
    });
  },

  retryDepartmentTask: (deptId) => {
    set((state) => ({
      departments: state.departments.map((d) =>
        d.id === deptId
          ? { ...d, status: 'working', progress: 35, lastErrorCode: undefined, lastErrorStage: undefined }
          : d
      ),
      employees: state.employees.map((e) =>
        e.departmentId === deptId && e.enabled !== false
          ? {
              ...e,
              errorText: undefined,
              errorCode: undefined,
              state: 'working',
              targetPosition: [...e.homePosition] as [number, number, number],
              chatBubble: '🔄 Đang thử lại kết nối API & thực thi lại task...',
            }
          : e
      ),
    }));
    setTimeout(() => {
      set((state) => ({
        departments: state.departments.map((d) =>
          d.id === deptId ? { ...d, status: 'idle', progress: 100 } : d
        ),
        employees: state.employees.map((e) =>
          e.departmentId === deptId && e.enabled !== false
            ? {
                ...e,
                state: 'idle',
                taskProgress: 100,
                chatBubble: '✅ Đã hoàn thành sau khi retry!',
              }
            : e
        ),
      }));
    }, 2400);
  },

  dispatchCeoTask: async ({
    prompt,
    targetDepartment,
    priority,
    includeVideo,
    attachments = [],
    campaignContextId,
  }) => {
    const contextChoice = campaignContextId || get().selectedCampaignContextId || 'NEW_CAMPAIGN';
    const existingThread =
      contextChoice !== 'NEW_CAMPAIGN' ? get().campaignThreads[contextChoice] : undefined;
    const isContinuingExisting = Boolean(existingThread);

    const taskId = isContinuingExisting
      ? existingThread!.taskId
      : `MKT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
          100 + Math.random() * 899
        )}`;
    const revision = isContinuingExisting ? existingThread!.revision + 1 : 1;
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // KHÂU 0: Kiểm tra đầu vào của CEO bằng try-catch
    try {
      if (!prompt || !prompt.trim()) {
        throw new PipelineStageError({
          code: 'ERR_EMPTY_PROMPT',
          stage: 'Khâu 0 — Tiếp nhận lệnh CEO (CEO HQ)',
          departmentId: 'MKT-DIRECTOR',
          message:
            'Nội dung yêu cầu chiến dịch (Prompt) đang để trống. Vui lòng nhập mục tiêu, sản phẩm hoặc nội dung công việc trước khi bấm Gửi Lệnh.',
        });
      }
    } catch (validationErr: any) {
      const code = validationErr?.code || 'ERR_INVALID_INPUT';
      const stage = validationErr?.stage || 'Khâu 0 — Tiếp nhận lệnh CEO';
      const message = validationErr?.message || 'Dữ liệu đầu vào không hợp lệ.';
      get().pinError({
        taskId,
        stage,
        departmentId: 'MKT-DIRECTOR',
        errorCode: code,
        message,
      });
      return { ok: false, errorCode: code, errorMessage: message };
    }

    const cleanPrompt = prompt.trim();
    const promptHistory = isContinuingExisting
      ? [...existingThread!.promptHistory, cleanPrompt]
      : [cleanPrompt];
    const mergedAttachments = isContinuingExisting
      ? [...existingThread!.attachments, ...attachments]
      : [...attachments];

    const hasVideoAsset = mergedAttachments.some((a) => a.type === 'video');
    const shouldIncludeVideo =
      includeVideo ||
      (isContinuingExisting && existingThread!.includeVideo) ||
      hasVideoAsset ||
      /video|clip|tiktok reel|kịch bản dựng/i.test(promptHistory.join(' '));

    let campaignPkg = buildCampaignPackage({
      taskId,
      revision,
      promptHistory,
      priority,
      includeVideo: shouldIncludeVideo,
      attachments: mergedAttachments,
    });

    const newTask: TaskRecord = {
      id: taskId,
      prompt: cleanPrompt,
      targetDepartment,
      priority,
      status: 'Đang làm',
      progress: 5,
      createdAt: `${new Date().toLocaleDateString('vi-VN')} ${nowStr}`,
      attachments: mergedAttachments,
      stepLogs: [
        `[${nowStr}] CEO ${
          isContinuingExisting ? `cập nhật (v${revision})` : 'khởi tạo chiến lược mới'
        } ${taskId} (Ưu tiên: ${priority}${
          attachments.length ? ` • Đính kèm mới: ${attachments.map((a) => a.name).join(', ')}` : ''
        })`,
      ],
    };

    // Xác định các phòng ban tham gia theo đúng Quy trình 8 bước trong AGENTS.md
    const involvedDepts: DepartmentId[] =
      targetDepartment !== 'AUTO'
        ? ['MKT-DIRECTOR', targetDepartment, 'QA-QC']
        : [
            'MKT-DIRECTOR',
            'RESEARCH',
            'PLANNER',
            'CONTENT',
            'DESIGN',
            ...(shouldIncludeVideo ? (['VIDEO'] as DepartmentId[]) : []),
            'COMMUNITY',
            'QA-QC',
            'OPS',
          ];

    const ceoChatMsg: ChatMessageItem = {
      id: `msg-ceo-${Date.now()}`,
      taskId,
      senderRole: 'CEO',
      senderName: 'CEO (Bạn)',
      avatarColor: '#10B981',
      stepBadge: isContinuingExisting
        ? `TIẾP TỤC CHIẾN DỊCH ${taskId} • LẦN CẬP NHẬT v${revision}`
        : `CHIẾN LƯỢC MỚI • ${taskId} • ƯU TIÊN: ${priority.toUpperCase()}`,
      content: cleanPrompt,
      timestamp: nowStr,
      status: 'completed',
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const baseMessages = isContinuingExisting ? [...existingThread!.messages, ceoChatMsg] : [ceoChatMsg];

    const updatedThread: CampaignContextThread = {
      taskId,
      title: campaignPkg.campaignTitle,
      occasionName: campaignPkg.occasionName,
      createdAt: isContinuingExisting
        ? existingThread!.createdAt
        : `${new Date().toLocaleDateString('vi-VN')} ${nowStr}`,
      revision,
      promptHistory,
      attachments: mergedAttachments,
      includeVideo: shouldIncludeVideo,
      messages: baseMessages,
    };

    // Helper đồng bộ tin nhắn vào đúng thread của Ma_Chien_Dich và khung chat hiện tại
    const syncThreadMessages = (
      updater: (msgs: ChatMessageItem[]) => ChatMessageItem[],
      nextTitle?: string
    ) => {
      set((state) => {
        const curThread = state.campaignThreads[taskId] || updatedThread;
        const nextMsgs = updater(curThread.messages);
        const nextThread: CampaignContextThread = {
          ...curThread,
          title: nextTitle || curThread.title,
          messages: nextMsgs,
        };
        const isCurrentlyViewingThisThread = state.selectedCampaignContextId === taskId;
        return {
          campaignThreads: {
            ...state.campaignThreads,
            [taskId]: nextThread,
          },
          chatMessages: isCurrentlyViewingThisThread ? nextMsgs : state.chatMessages,
        };
      });
    };

    // Mở ngay bảng Live Chat, chuyển bối cảnh sang taskId này và kích hoạt các phòng ban trên sa bàn 3D
    set((state) => {
      const existingTaskIdx = state.tasks.findIndex((t) => t.id === taskId);
      const nextTasks =
        existingTaskIdx >= 0
          ? state.tasks.map((t, i) => (i === existingTaskIdx ? newTask : t))
          : [newTask, ...state.tasks];

      return {
        activeTaskId: taskId,
        tasks: nextTasks,
        isCeoTaskModalOpen: false,
        isChatPanelOpen: true,
        selectedCampaignContextId: taskId,
        campaignThreads: {
          ...state.campaignThreads,
          [taskId]: updatedThread,
        },
        chatMessages: baseMessages,
        departments: state.departments.map((d) =>
          involvedDepts.includes(d.id)
            ? {
                ...d,
                status: d.id === 'MKT-DIRECTOR' ? 'working' : 'idle',
                progress: d.id === 'MKT-DIRECTOR' ? 15 : 0,
                active: true,
                lastErrorCode: undefined,
                lastErrorStage: undefined,
              }
            : d
        ),
        employees: state.employees.map((e) => {
          if (!involvedDepts.includes(e.departmentId) || e.enabled === false) return e;
          return {
            ...e,
            state: 'walking',
            targetPosition: [
              e.homePosition[0] * 0.55 + (Math.random() * 1.4 - 0.7),
              0,
              e.homePosition[2] * 0.55 + (Math.random() * 1.4 - 0.7),
            ] as [number, number, number],
            currentTask: `${taskId} (v${revision}): ${campaignPkg.campaignTitle.slice(0, 48)}...`,
            taskProgress: 10,
            chatBubble: `🚶 Đang nhận lệnh chiến dịch ${taskId} từ CEO...`,
            errorText: undefined,
            errorCode: undefined,
          };
        }),
      };
    });

    // Chạy luồng thực thi từng bước bất đồng bộ để vừa điều khiển nhân vật 3D vừa stream hội thoại vào ô Chat
    (async () => {
      let errorCount = 0;

      for (let idx = 0; idx < involvedDepts.length; idx++) {
        const deptId = involvedDepts[idx];
        const stepNum = idx + 1;
        const totalSteps = involvedDepts.length;
        const stageLabel = `Bước ${stepNum}/${totalSteps} — Phòng ${deptId}`;
        const progressPct = Math.round(((idx + 1) / (totalSteps + 1)) * 100);
        const stepTimeStr = new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const deptBuilding = get().departments.find((d) => d.id === deptId);
        const deptEmployees = get().employees.filter(
          (e) => e.departmentId === deptId && e.enabled !== false
        );

        // Nếu toàn bộ nhân viên trong phòng ban này đang OFF -> ghi nhận bỏ qua bước này
        if (deptEmployees.length === 0) {
          const skipMsg: ChatMessageItem = {
            id: `msg-skip-${taskId}-${deptId}-${Date.now()}`,
            taskId,
            senderRole: deptId,
            senderName: `Phòng ${deptId} (Đang OFF)`,
            avatarColor: deptBuilding?.color || '#64748B',
            stepBadge: `${stageLabel} • ĐÃ TẮT OFF`,
            content: `⏸️ Tất cả nhân sự thuộc phòng **${deptId}** đang được CEO đặt ở chế độ nghỉ (**OFF**). Hệ thống tự động bỏ qua khâu này và chuyển sang bước tiếp theo.`,
            timestamp: stepTimeStr,
            status: 'skipped',
          };
          syncThreadMessages((msgs) => [...msgs, skipMsg]);
          get().handleSseTaskStep({
            taskId,
            departmentId: deptId,
            stage: stageLabel,
            status: 'completed',
            progress: progressPct,
            tokensUsed: 0,
            message: `⏸️ [${stageLabel}] Nhân sự phòng ${deptId} đang OFF — Bỏ qua khâu này.`,
          });
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }

        const empWithExternal = deptEmployees.find(
          (e) => e.provider !== 'antigravity' && e.provider !== 'mock'
        );
        const leadEmp = empWithExternal || deptEmployees[0];
        const providerModelBadge = formatProviderModel(leadEmp.provider, leadEmp.model);
        const workingMsgId = `msg-step-${taskId}-${deptId}-${Date.now()}`;

        set((state) => ({
          departments: state.departments.map((d) =>
            d.id === deptId ? { ...d, status: 'working', progress: 45 } : d
          ),
          employees: state.employees.map((e) =>
            e.departmentId === deptId && e.enabled !== false
              ? {
                  ...e,
                  state: 'working',
                  targetPosition: [...e.homePosition] as [number, number, number],
                  taskProgress: 45,
                  chatBubble:
                    deptId === 'DESIGN'
                      ? `🎨 Đang kết xuất 4 Poster mới cho ${taskId}...`
                      : `⚙️ [${deptId}] Đang xử lý Bước ${stepNum}/${totalSteps}...`,
                }
              : e
          ),
        }));

        syncThreadMessages((msgs) => [
          ...msgs,
          {
            id: workingMsgId,
            taskId,
            senderRole: deptId,
            senderName: `${leadEmp.name} (${deptBuilding?.roleVi || deptId})`,
            avatarColor: leadEmp.avatarColor || deptBuilding?.color || '#3B82F6',
            providerModel: providerModelBadge,
            stepBadge: `${stageLabel} • ${taskId}`,
            content:
              deptId === 'DESIGN'
                ? `🎨 **${leadEmp.name}** đang kết xuất **04 ấn phẩm thiết kế MỚI HOÀN TOÀN** (\`DES-01..04\`) cho chiến dịch **${campaignPkg.campaignTitle}** và lưu vào \`assets/\`...`
                : `⏳ **${leadEmp.name}** đang thực thi nhiệm vụ tại **Phòng ${deptId}** bằng model \`${providerModelBadge}\`...`,
            timestamp: stepTimeStr,
            status: 'working',
          },
        ]);

        await new Promise((r) => setTimeout(r, 550));

        // KHỐI TRY-CATCH TỪNG KHÂU: Kiểm tra API Key, Kết xuất Poster mới (ở bước DESIGN) & Gọi Model
        try {
          for (const emp of deptEmployees) {
            const needsExternalKey =
              emp.provider !== 'antigravity' && emp.provider !== 'mock';
            const hasKey = Boolean(emp.maskedApiKey && emp.maskedApiKey.trim().length > 0);

            if (needsExternalKey && !hasKey) {
              throw new PipelineStageError({
                code: 'ERR_MISSING_API_KEY',
                stage: `${stageLabel} (${emp.name})`,
                departmentId: deptId,
                employeeId: emp.id,
                employeeName: emp.name,
                provider: emp.provider,
                model: emp.model,
                message: `Chưa cài đặt API Key cho nhân viên ${emp.name} (${formatProviderModel(
                  emp.provider,
                  emp.model
                )}) tại ${stageLabel}. Vui lòng nhập API Key, bấm OFF nhân viên này hoặc chuyển sang ANTIGRAVITY.`,
              });
            }
          }

          // Nếu đang ở Bước DESIGN: Kết xuất 4 file ảnh Poster MỚI HOÀN TOÀN trên Canvas và lưu vào assets/
          if (deptId === 'DESIGN') {
            const renderedPosters = await generateCampaignPosters(campaignPkg.posterSpec);
            if (renderedPosters.length === 4) {
              campaignPkg = buildCampaignPackage({
                taskId,
                revision,
                promptHistory,
                priority,
                includeVideo: shouldIncludeVideo,
                attachments: mergedAttachments,
                renderedPosters,
              });
            }
          }

          let extraLlmText = '';
          let stepTokens = 380 + idx * 45;

          if (leadEmp.provider !== 'antigravity' && leadEmp.provider !== 'mock') {
            const llmResp = await fetch('/api/llm/step', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId,
                stepNumber: stepNum,
                totalSteps,
                departmentId: deptId,
                employeeId: leadEmp.id,
                employeeName: leadEmp.name,
                provider: leadEmp.provider,
                model: leadEmp.model,
                baseUrl: leadEmp.baseUrl,
                temperature: leadEmp.temperature,
                maxTokens: leadEmp.maxTokens,
                systemPrompt: leadEmp.systemPrompt,
                userPrompt: `[Chiến dịch ${taskId} - ${campaignPkg.campaignTitle}] Yêu cầu của CEO: ${promptHistory.join(
                  ' | '
                )}. Hãy trình bày kết quả thực thi ngắn gọn của phòng ${deptId}.`,
              }),
            });

            const llmData = await llmResp.json().catch(() => ({}));
            if (!llmResp.ok || !llmData.ok) {
              throw new PipelineStageError({
                code: llmData.code || `ERR_HTTP_${llmResp.status}`,
                stage: `${stageLabel} (${leadEmp.name})`,
                departmentId: deptId,
                employeeId: leadEmp.id,
                employeeName: leadEmp.name,
                provider: leadEmp.provider,
                model: leadEmp.model,
                message:
                  llmData.error ||
                  `Lỗi kết nối API (${llmResp.status}) khi gọi ${formatProviderModel(
                    leadEmp.provider,
                    leadEmp.model
                  )}.`,
              });
            }
            if (llmData.output && !llmData.simulated) {
              extraLlmText = `\n\n> **Phản hồi trực tiếp từ \`${providerModelBadge}\`**:\n> ${String(
                llmData.output
              ).replace(/\n/g, '\n> ')}`;
            }
            if (llmData.tokensUsed) {
              stepTokens = llmData.tokensUsed;
            }
          }

          const deptNarrative =
            (campaignPkg.stepNarratives[deptId] ||
              `✅ Đã hoàn thành nhiệm vụ của phòng **${deptId}**.`) + extraLlmText;
          const deptSheets = campaignPkg.sheetsByDept[deptId] || [];
          const deptVisuals = deptId === 'DESIGN' ? campaignPkg.visualAssets : undefined;

          syncThreadMessages((msgs) =>
            msgs.map((m) =>
              m.id === workingMsgId
                ? {
                    ...m,
                    content: deptNarrative,
                    status: 'completed',
                    sheets: deptSheets.length > 0 ? deptSheets : undefined,
                    visualAssets: deptVisuals,
                  }
                : m
            )
          );

          get().handleSseTaskStep({
            taskId,
            departmentId: deptId,
            employeeId: leadEmp.id,
            employeeName: leadEmp.name,
            provider: leadEmp.provider,
            model: leadEmp.model,
            stage: stageLabel,
            status: 'completed',
            progress: progressPct,
            tokensUsed: stepTokens,
            message: `✅ [${stageLabel}] ${leadEmp.name} (${providerModelBadge}) hoàn thành xuất dữ liệu chuẩn TSV.`,
          });
        } catch (stageErr: any) {
          errorCount += 1;
          const errCode = stageErr?.code || 'ERR_STAGE_EXECUTION_FAILED';
          const errStage = stageErr?.stage || stageLabel;
          const errMsg = stageErr?.message || `Lỗi thực thi tại ${stageLabel}.`;

          get().pinError({
            taskId,
            stage: errStage,
            departmentId: deptId,
            employeeId: stageErr?.employeeId || leadEmp.id,
            employeeName: stageErr?.employeeName || leadEmp.name,
            provider: stageErr?.provider || leadEmp.provider,
            model: stageErr?.model || leadEmp.model,
            errorCode: errCode,
            message: errMsg,
          });

          syncThreadMessages((msgs) =>
            msgs.map((m) =>
              m.id === workingMsgId
                ? {
                    ...m,
                    status: 'error',
                    errorCode: errCode,
                    content: `❌ **[MÃ LỖI: ${errCode}]** tại **${errStage}**:\n${errMsg}`,
                  }
                : m
            )
          );

          get().handleSseTaskStep({
            taskId,
            departmentId: deptId,
            employeeId: stageErr?.employeeId || leadEmp.id,
            employeeName: stageErr?.employeeName || leadEmp.name,
            provider: stageErr?.provider || leadEmp.provider,
            model: stageErr?.model || leadEmp.model,
            stage: errStage,
            status: 'error',
            errorCode: errCode,
            progress: progressPct,
            tokensUsed: 0,
            error: `[${errCode}] ${errMsg}`,
            message: `❌ [${errCode}] Lỗi tại ${errStage}: ${errMsg}`,
          });
        }

        await new Promise((r) => setTimeout(r, 320));
      }

      // BƯỚC 8 — BÁO CÁO TỔNG HỢP 9 SHEETS TSV, HIỂN THỊ 4 ẢNH MỚI & ĐỒNG BỘ GOOGLE SHEETS
      const finalTimeStr = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (errorCount === 0) {
        const finalMsgId = `msg-final-${taskId}-${Date.now()}`;
        const directorEmp =
          get().employees.find((e) => e.departmentId === 'MKT-DIRECTOR' && e.enabled !== false) ||
          get().employees[0];

        syncThreadMessages(
          (msgs) => [
            ...msgs,
            {
              id: finalMsgId,
              taskId,
              senderRole: 'MKT-DIRECTOR',
              senderName: `${directorEmp.name} — BÁO CÁO TỔNG HỢP 9 SHEETS CHO CEO`,
              avatarColor: '#22C55E',
              providerModel: formatProviderModel(directorEmp.provider, directorEmp.model),
              stepBadge: `BƯỚC 8/8 • ${taskId} (v${revision}) • BÁO CÁO CUỐI`,
              content: `🎉 **[Bước 8 – BÁO CÁO TỔNG HỢP & ĐỒNG BỘ GOOGLE SHEETS]**\nChiến dịch **${taskId}** (*${campaignPkg.campaignTitle}*) đã hoàn tất 100% và vượt qua kiểm duyệt **QA-QC (PASS 9.7/10)**.\nDưới đây là trọn bộ **9 Sheets TSV chuẩn**, **04 Ấn phẩm thiết kế MỚI HOÀN TOÀN** (\`${taskId}_DES_01..04.png\`) và **TÓM TẮT CHO CEO (5 dòng)**:`,
              timestamp: finalTimeStr,
              status: 'completed',
              visualAssets: campaignPkg.visualAssets,
              sheets: campaignPkg.allNineSheets,
              ceoSummaryLines: campaignPkg.ceoSummaryLines,
              reportFile: `reports/${taskId}.md`,
              sheetUrl:
                'https://docs.google.com/spreadsheets/d/19oW1jOHOw81LpSLwhDWWHY7Cz91BJkjT5WUhBGaekXc/edit',
              syncedToSheet: false,
            },
          ],
          campaignPkg.campaignTitle
        );

        try {
          const syncResp = await fetch('/api/tasks/sync-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId,
              markdownContent: campaignPkg.markdownReport,
            }),
          });
          const syncData = await syncResp.json().catch(() => ({}));
          if (syncResp.ok && syncData.ok) {
            syncThreadMessages((msgs) =>
              msgs.map((m) =>
                m.id === finalMsgId
                  ? {
                      ...m,
                      syncedToSheet: Boolean(syncData.syncedToSheet),
                      reportFile: syncData.savedReport || `reports/${taskId}.md`,
                    }
                  : m
              )
            );
          }
        } catch {
          // Bỏ qua nếu đang chạy bản tĩnh
        }
      }

      get().handleSseTaskCompleted({
        taskId,
        hasErrors: errorCount > 0,
        errorCount,
        summary:
          errorCount > 0
            ? `⚠️ Chiến dịch ${taskId} bị gián đoạn tại ${errorCount} khâu do lỗi cấu hình Model/API Key.`
            : `✅ Chiến dịch ${taskId} (${campaignPkg.campaignTitle}) đã hoàn tất 9 Sheets TSV, kết xuất 04 ấn phẩm mới tại assets/ và đồng bộ Google Sheet BaoNguyn-Company (QA-QC PASS 9.7/10).`,
      });
    })();

    return { ok: true };
  },

  handleSseTaskStep: (data) => {
    const {
      taskId,
      departmentId,
      employeeId,
      employeeName,
      provider,
      model,
      stage,
      status,
      progress,
      tokensUsed = 250,
      message,
      error,
      errorCode,
    } = data;

    // Nếu bước thực thi từ SSE báo lỗi -> tự động ghim lỗi lên bảng PinnedErrors
    if (status === 'error') {
      get().pinError({
        taskId,
        stage: stage || `Khâu Phòng ${departmentId}`,
        departmentId,
        employeeId,
        employeeName,
        provider,
        model,
        errorCode: errorCode || 'ERR_LLM_EXECUTION',
        message: error || message || `Lỗi thực thi tại phòng ${departmentId}`,
      });
    }

    set((state) => ({
      currentSessionCostUsd: Number((state.currentSessionCostUsd + tokensUsed * 0.000005).toFixed(4)),
      departments: state.departments.map((d) =>
        d.id === departmentId
          ? {
              ...d,
              status: status === 'error' ? 'error' : status === 'completed' ? 'idle' : 'working',
              progress: status === 'completed' ? 100 : progress || 55,
              lastErrorCode: status === 'error' ? errorCode || 'ERR_LLM_EXECUTION' : d.lastErrorCode,
              lastErrorStage: status === 'error' ? stage : d.lastErrorStage,
            }
          : d
      ),
      employees: state.employees.map((e) => {
        if (e.departmentId !== departmentId || e.enabled === false) return e;
        const isTargetErrorEmp =
          status === 'error' && (!employeeId || e.id === employeeId);
        return {
          ...e,
          state: status === 'completed' ? 'idle' : 'working',
          taskProgress: status === 'completed' ? 100 : progress || 60,
          totalTokensUsed: e.totalTokensUsed + (status === 'completed' ? tokensUsed : 0),
          estimatedCostUsd: Number(
            (e.estimatedCostUsd + (status === 'completed' ? tokensUsed * 0.000006 : 0)).toFixed(4)
          ),
          completedTasksCount:
            status === 'completed' ? e.completedTasksCount + 1 : e.completedTasksCount,
          chatBubble: message?.slice(0, 76),
          errorText: isTargetErrorEmp ? error || message : e.errorText,
          errorCode: isTargetErrorEmp ? errorCode || 'ERR_LLM_EXECUTION' : e.errorCode,
        };
      }),
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              progress: progress || t.progress,
              status: status === 'error' ? 'Lỗi' : t.status === 'Lỗi' ? 'Lỗi' : 'Đang làm',
              errorCode: status === 'error' ? errorCode || 'ERR_LLM_EXECUTION' : t.errorCode,
              stepLogs: message ? [...t.stepLogs, message] : t.stepLogs,
            }
          : t
      ),
    }));
  },

  handleSseTaskCompleted: (data) => {
    const { taskId, summary, hasErrors } = data;
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    set((state) => ({
      activeTaskId: null,
      departments: state.departments.map((d) => ({
        ...d,
        status: d.status === 'error' ? 'error' : 'idle',
        progress: d.status === 'error' ? d.progress : 0,
      })),
      employees: state.employees.map((e) =>
        e.enabled === false
          ? e
          : {
              ...e,
              state: 'idle',
              currentTask: e.errorText ? e.currentTask : undefined,
              taskProgress: 0,
              // Giữ nguyên thông báo lỗi trên nhân viên nếu nhân viên đó bị lỗi API Key
              chatBubble: e.errorText
                ? `❌ [${e.errorCode || 'ERR_API'}] Cần cấu hình API Key!`
                : e.departmentId === 'MKT-DIRECTOR'
                ? hasErrors
                  ? '⚠️ Có phòng ban lỗi API Key! Xem bảng ghim lỗi.'
                  : '🎉 Báo cáo 9 Sheets đã gửi CEO!'
                : undefined,
            }
      ),
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: hasErrors || t.status === 'Lỗi' ? 'Lỗi' : 'Đã duyệt',
              progress: 100,
              completedAt: `25/10/2026 ${nowStr}`,
              summary,
            }
          : t
      ),
    }));
  },

  tickAutonomousBehavior: () => {
    const state = get();
    if (!state.autonomousMode) return;
    if (state.currentSessionCostUsd >= state.costLimitUsd) return;

    const dialogues = state.lang === 'vi' ? IDLE_CHAT_DIALOGUES_VI : IDLE_CHAT_DIALOGUES_EN;

    set((prev) => {
      const updated = prev.employees.map((emp) => {
        // Nếu nhân viên đang ở chế độ OFF theo lệnh CEO -> giữ nguyên nghỉ ngơi tại Căng-tin, không làm việc
        if (emp.enabled === false) {
          return {
            ...emp,
            state: 'resting' as EmployeeState,
            chatBubble:
              prev.lang === 'vi'
                ? '⏸️ Đang tạm nghỉ (OFF) theo lệnh CEO'
                : '⏸️ Off-duty (OFF) by CEO command',
          };
        }

        // Nếu nhân viên đang working cho task thật hoặc đang có lỗi API Key thì giữ nguyên ở tòa phòng ban
        if ((emp.state === 'working' && prev.activeTaskId) || emp.errorText) {
          return emp;
        }

        const roll = Math.random();
        // 35% giữ trạng thái hiện tại
        if (roll < 0.35) return emp;

        // Nếu đang ở trạng thái rảnh, cho di chuyển tới Căng-tin hoặc đi dạo trên đường环形 (ring road) hoặc về phòng ban
        if (roll < 0.65) {
          const goCanteen = Math.random() < 0.58;
          const nextState: EmployeeState = goCanteen
            ? (['resting', 'eating', 'cooking', 'walking'][Math.floor(Math.random() * 4)] as EmployeeState)
            : 'walking';

          const target: [number, number, number] = goCanteen
            ? [
                CANTEEN_POSITION[0] + (Math.random() * 8 - 4),
                0,
                CANTEEN_POSITION[2] + (Math.random() * 4 - 2),
              ]
            : Math.random() < 0.5
            ? [
                emp.homePosition[0] + (Math.random() * 2.4 - 1.2),
                0,
                emp.homePosition[2] + (Math.random() * 2.4 - 1.2),
              ]
            : [
                Math.cos(Math.random() * Math.PI * 2) * 8.5,
                0,
                Math.sin(Math.random() * Math.PI * 2) * 8.5,
              ];

          const activityLabelsVi: Record<EmployeeState, string | undefined> = {
            idle: undefined,
            walking: undefined,
            working: 'Đang rà soát tài liệu chiến dịch...',
            resting: '☕ Nghỉ giải lao tại Căng-tin',
            eating: '🍜 Đang thưởng thức bữa nhẹ ở Căng-tin',
            cooking: '🍳 Đang pha cà phê Espresso & chuẩn bị đồ ăn',
            chatting: emp.chatBubble,
          };

          const activityLabelsEn: Record<EmployeeState, string | undefined> = {
            idle: undefined,
            walking: undefined,
            working: 'Reviewing campaign sheets...',
            resting: '☕ Taking a coffee break at Canteen',
            eating: '🍜 Having a snack at Canteen',
            cooking: '🍳 Brewing fresh Espresso at Canteen',
            chatting: emp.chatBubble,
          };

          return {
            ...emp,
            state: nextState,
            targetPosition: target,
            chatBubble: prev.lang === 'vi' ? activityLabelsVi[nextState] : activityLabelsEn[nextState],
          };
        }

        return { ...emp, chatBubble: undefined };
      });

      // Chọn ngẫu nhiên 1 cặp nhân viên gần nhau để "tám chuyện" (chatting) với bong bóng hội thoại (không chọn nhân viên đang OFF)
      const freeEmployees = updated.filter(
        (e) => e.enabled !== false && e.state !== 'working' && !e.errorText
      );
      if (freeEmployees.length >= 2 && Math.random() < 0.65) {
        const pairIdx = Math.floor(Math.random() * (freeEmployees.length - 1));
        const empA = freeEmployees[pairIdx];
        const empB = freeEmployees[pairIdx + 1];
        const [lineA, lineB] = dialogues[Math.floor(Math.random() * dialogues.length)];

        const midX = (empA.targetPosition[0] + empB.targetPosition[0]) / 2;
        const midZ = (empA.targetPosition[2] + empB.targetPosition[2]) / 2;

        for (let i = 0; i < updated.length; i++) {
          if (updated[i].id === empA.id) {
            updated[i] = {
              ...updated[i],
              state: 'chatting',
              targetPosition: [midX - 0.7, 0, midZ],
              chatBubble: lineA,
              chatPartnerId: empB.id,
            };
          } else if (updated[i].id === empB.id) {
            updated[i] = {
              ...updated[i],
              state: 'chatting',
              targetPosition: [midX + 0.7, 0, midZ],
              chatBubble: lineB,
              chatPartnerId: empA.id,
            };
          }
        }
      }

      return { employees: updated };
    });
  },

  syncFromBackend: async () => {
    try {
      const res = await fetch('/api/core-init');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;

      set((state) => ({
        employees: state.employees.map((emp) => {
          const masked = data.maskedEmployeeKeys?.[emp.id] || emp.maskedApiKey;
          const validModel = getValidModelForProvider(emp.provider, emp.model);
          return {
            ...emp,
            maskedApiKey: masked,
            model: validModel,
          };
        }),
      }));
    } catch {
      // Backend optional in pure static preview
    }
  },
}));
