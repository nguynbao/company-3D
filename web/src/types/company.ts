export type DepartmentId =
  | 'MKT-DIRECTOR'
  | 'PLANNER'
  | 'RESEARCH'
  | 'CONTENT'
  | 'DESIGN'
  | 'VIDEO'
  | 'OPS'
  | 'COMMUNITY'
  | 'QA-QC';

export type BuildingStatus = 'idle' | 'working' | 'error';

export type EmployeeState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'resting'
  | 'eating'
  | 'cooking'
  | 'chatting';

export type LLMProvider = 'antigravity' | 'openai' | 'anthropic' | 'deepseek' | 'openrouter' | 'mock';

export const MODEL_OPTIONS: Record<LLMProvider, string[]> = {
  antigravity: ['pro', 'flash', 'flash_lite', 'inherit'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  anthropic: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-3.7-sonnet', 'deepseek/deepseek-r1'],
  mock: ['demo-fast-v1'],
};

export function getValidModelForProvider(provider: LLMProvider, currentModel?: string): string {
  const options = MODEL_OPTIONS[provider] || MODEL_OPTIONS.antigravity;
  if (currentModel && options.includes(currentModel)) {
    return currentModel;
  }
  return options[0];
}

export function formatProviderModel(provider: LLMProvider, model: string): string {
  const validModel = getValidModelForProvider(provider, model);
  return `${provider}/${validModel}`;
}

export interface SkillItem {
  id: string;
  name: string;
  path: string;
  description: string;
  enabled: boolean;
  sourceUrl?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'image' | 'video';
  mimeType?: string;
  size?: number;
  url: string;
  path: string;
}

export interface PinnedErrorAlert {
  id: string;
  taskId?: string;
  stage: string;
  departmentId?: DepartmentId;
  employeeId?: string;
  employeeName?: string;
  provider?: LLMProvider;
  model?: string;
  errorCode: string;
  message: string;
  timestamp: string;
}

export interface TaskRecord {
  id: string;
  prompt: string;
  targetDepartment: DepartmentId | 'AUTO';
  priority: 'Cao' | 'Trung bình' | 'Thấp';
  status: 'Chưa bắt đầu' | 'Đang làm' | 'Chờ QA' | 'Cần sửa' | 'Đã duyệt' | 'Đã lên lịch' | 'Đã đăng' | 'Lỗi';
  progress: number;
  createdAt: string;
  completedAt?: string;
  summary?: string;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  attachments?: TaskAttachment[];
  stepLogs: string[];
  errorCode?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  description: string;
  enabled?: boolean;
  avatarColor: string;
  shirtColor: string;
  hairColor: string;
  state: EmployeeState;
  position: [number, number, number];
  targetPosition: [number, number, number];
  homePosition: [number, number, number];
  currentTask?: string;
  taskProgress: number;
  chatBubble?: string;
  chatPartnerId?: string;
  errorText?: string;
  errorCode?: string;
  // Model Configuration
  provider: LLMProvider;
  model: string;
  maskedApiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  // Skills & Capabilities
  skills: SkillItem[];
  tools: string[];
  memoryNotes: string[];
  permissions: string[];
  // Telemetry & Stats
  completedTasksCount: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  taskHistory: {
    id: string;
    title: string;
    date: string;
    status: string;
    tokens: number;
  }[];
}

export interface DepartmentBuilding {
  id: DepartmentId;
  name: string;
  shortName: string;
  roleVi: string;
  roleEn: string;
  position: [number, number, number];
  color: string;
  roofColor: string;
  status: BuildingStatus;
  progress: number;
  active: boolean;
  activationPolicy?: 'always' | 'on_demand_only';
  outputSheets: string[];
  agentFile: string;
  defaultSkillPath: string;
  lastErrorCode?: string;
  lastErrorStage?: string;
}

export type CeoAttachmentItem = TaskAttachment;

export interface SheetTableData {
  sheetName: string;
  headers: string[];
  rows: string[][];
}

export interface ChatMessageItem {
  id: string;
  taskId: string;
  senderRole: 'CEO' | 'SYSTEM' | DepartmentId;
  senderName: string;
  avatarColor?: string;
  providerModel?: string;
  stepBadge?: string;
  content: string;
  timestamp: string;
  status?: 'working' | 'completed' | 'error' | 'skipped';
  errorCode?: string;
  attachments?: CeoAttachmentItem[];
  visualAssets?: { code: string; title: string; url: string; filePath?: string; ratio: string }[];
  sheets?: SheetTableData[];
  ceoSummaryLines?: string[];
  reportFile?: string;
  sheetUrl?: string;
  syncedToSheet?: boolean;
}

export interface CampaignContextThread {
  taskId: string; // Ma_Chien_Dich (e.g., MKT-20261026-301)
  title: string; // Ten_Chien_Dich
  occasionName: string;
  createdAt: string;
  revision: number;
  promptHistory: string[];
  attachments: CeoAttachmentItem[];
  includeVideo: boolean;
  messages: ChatMessageItem[];
}


