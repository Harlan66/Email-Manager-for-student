// 邮件标签类型
export type EmailTag = '🔴' | '🟡' | '🟢' | '⚪';

// 紧急度类型
export type UrgencyLevel = 'urgent' | 'warning' | 'normal' | 'archived';

// 时间粒度类型
export type TimeRange = '今日' | '本周' | '本月' | '全部';

// 筛选类型
export type FilterType = 'all' | 'urgent' | 'warning' | 'normal';

// AI模式类型
export type AIMode = 'local' | 'api' | 'hybrid';

// API服务商类型
export type APIProvider = 'openai' | 'anthropic' | 'deepseek' | 'glm' | 'qwen' | 'minimax' | 'moonshot';

// 邮件数据接口
export interface Email {
  id: string;
  tag: EmailTag;
  urgency: UrgencyLevel;
  subject: string;
  sender_name: string;
  sender_email: string;
  time: string;
  has_deadline: boolean;
  deadline?: string;
  has_attachments: boolean;
  attachment_count: number;
  summary: string;
  ai_model: string;
  tags: string[];
  body: string;
  is_read: boolean;
  is_archived: boolean;
}

// 置顶DDL数据接口
export interface UrgentDDL {
  id: string;
  tag: EmailTag;
  urgency: UrgencyLevel;
  title: string;
  deadline: string;
  days_left: number;
}

// 统计概览数据接口
export interface OverviewData {
  total: number;
  urgent_ddl: number;
  near_deadline: number;
  time_range: TimeRange;
}

// 邮箱配置接口
export interface EmailConfig {
  imap_server: string;
  email: string;
  password: string;
}

// 本地AI配置接口
export interface LocalAIConfig {
  model: string;
  host: string;
}

// API AI配置接口
export interface APIAIConfig {
  provider: APIProvider;
  model: string;
  key: string;
}

// 混合AI配置接口
export interface HybridAIConfig {
  local_model: string;
  api_provider: APIProvider;
  api_model: string;
  api_key: string;
  confirm_before_api: boolean;
}

// 完整设置配置接口
export interface SettingsConfig {
  email: EmailConfig;
  ai_mode: AIMode;
  local: LocalAIConfig;
  api: APIAIConfig;
  hybrid: HybridAIConfig;
  theme: 'light' | 'dark';
  language: 'zh' | 'en';
}

// 标签配置映射
export const TAG_CONFIG: Record<EmailTag, {
  color: string;
  label: string;
  bgColor: string;
  urgency: UrgencyLevel;
}> = {
  '🔴': {
    color: '#C45A4A',
    label: '紧急',
    bgColor: 'rgba(196, 90, 74, 0.08)',
    urgency: 'urgent'
  },
  '🟡': {
    color: '#D4A574',
    label: '重要',
    bgColor: 'rgba(212, 165, 116, 0.08)',
    urgency: 'warning'
  },
  '🟢': {
    color: '#7A9AA8',
    label: '日常',
    bgColor: 'rgba(122, 154, 168, 0.08)',
    urgency: 'normal'
  },
  '⚪': {
    color: '#9B9B9B',
    label: '归档',
    bgColor: 'rgba(155, 155, 155, 0.08)',
    urgency: 'archived'
  },
};

// 紧急度颜色映射（东方色）
export const URGENCY_COLORS: Record<UrgencyLevel | 'indigo', {
  main: string;
  light: string;
  label: string;
}> = {
  urgent: {
    main: '#C45A4A',
    light: 'rgba(196, 90, 74, 0.08)',
    label: '紧急'
  },
  warning: {
    main: '#D4A574',
    light: 'rgba(212, 165, 116, 0.08)',
    label: '重要'
  },
  normal: {
    main: '#7A9AA8',
    light: 'rgba(122, 154, 168, 0.08)',
    label: '日常'
  },
  archived: {
    main: '#9B9B9B',
    light: 'rgba(155, 155, 155, 0.08)',
    label: '归档'
  },
  indigo: {
    main: '#7A9AA8',
    light: 'rgba(122, 154, 168, 0.08)',
    label: '青黛'
  },
};

// 时间粒度配置
export const TIME_RANGES: TimeRange[] = ['今日', '本周', '本月', '全部'];

// AI模式配置
export const AI_MODES: { value: AIMode; label: string; description: string }[] = [
  { value: 'local', label: '本地', description: '100%本地Ollama，零网络请求' },
  { value: 'api', label: 'API', description: '100%云端API，高准确率' },
  { value: 'hybrid', label: '混合', description: '简单任务本地，复杂任务API' },
];

// 本地模型选项
export const LOCAL_MODELS = [
  { value: 'llama3.1:8b', label: 'Llama 3.1 (8B)' },
  { value: 'qwen2.5:7b', label: 'Qwen 2.5 (7B)' },
  { value: 'mistral:7b', label: 'Mistral (7B)' },
  { value: 'deepseek-coder:6.7b', label: 'DeepSeek Coder (6.7B)' },
];

// API服务商选项
export const API_PROVIDERS: { value: APIProvider; label: string; badge?: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek', badge: '国产' },
  { value: 'glm', label: '智谱GLM', badge: '国产' },
  { value: 'qwen', label: '通义千问', badge: '国产' },
  { value: 'minimax', label: 'MiniMax', badge: '国产' },
  { value: 'moonshot', label: 'Kimi/Moonshot', badge: '国产' },
];

// API模型选项
export const API_MODELS: Record<APIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Old)' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  ],
  glm: [
    { value: 'glm-4-flash', label: 'GLM-4 Flash (免费)' },
    { value: 'glm-4-air', label: 'GLM-4 Air' },
    { value: 'glm-4', label: 'GLM-4' },
  ],
  qwen: [
    { value: 'qwen-turbo', label: '千问 Turbo' },
    { value: 'qwen-plus', label: '千问 Plus' },
    { value: 'qwen-max', label: '千问 Max' },
  ],
  minimax: [
    { value: 'abab6.5s-chat', label: 'MiniMax 6.5s' },
    { value: 'abab5.5-chat', label: 'MiniMax 5.5' },
  ],
  moonshot: [
    { value: 'moonshot-v1-8k', label: 'Moonshot 8K' },
    { value: 'moonshot-v1-32k', label: 'Moonshot 32K' },
    { value: 'moonshot-v1-128k', label: 'Moonshot 128K' },
  ],
};

