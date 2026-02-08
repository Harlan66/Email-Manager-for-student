import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  testIMAPConnection,
  testLocalAIConnection,
  testAPIConnection,
  exportTestReport
} from '@/services/api';
import {
  Mail,
  Bot,
  Palette,
  TestTube,
  Server,
  Cloud,
  Layers,
  Check,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import type { SettingsConfig, AIMode, APIProvider } from '@/types';
import { LOCAL_MODELS, API_PROVIDERS, API_MODELS, URGENCY_COLORS } from '@/types';
import { toast } from 'sonner';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsConfig;
  onSave: (settings: SettingsConfig) => void;
}

// 卡片式Radio选项
interface RadioCardOption {
  value: AIMode;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
}

const radioOptions: RadioCardOption[] = [
  {
    value: 'local',
    icon: Server,
    title: '本地',
    description: '100%本地Ollama，零网络请求'
  },
  {
    value: 'api',
    icon: Cloud,
    title: 'API',
    description: '100%云端API，高准确率'
  },
  {
    value: 'hybrid',
    icon: Layers,
    title: '混合',
    description: '简单任务本地，复杂任务API',
    badge: '推荐'
  },
];

export function SettingsPanel({ isOpen, onClose, settings, onSave }: SettingsPanelProps) {
  const { setTheme, setLanguage, t } = useTheme();
  // Clear masked passwords on initialization so user must re-enter
  const initSettings = (): SettingsConfig => {
    const s = { ...settings };
    // Clear masked password placeholders
    if (s.email?.password === '***') {
      s.email = { ...s.email, password: '' };
    }
    if (s.api?.key === '***') {
      s.api = { ...s.api, key: '' };
    }
    if (s.hybrid?.api_key === '***') {
      s.hybrid = { ...s.hybrid, api_key: '' };
    }
    return s;
  };
  const [localSettings, setLocalSettings] = useState<SettingsConfig>(initSettings);
  const [aiMode, setAiMode] = useState<AIMode>(settings.ai_mode);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm('有未保存的更改，确定要退出吗？')) {
        return;
      }
    }
    setIsDirty(false);
    onClose();
  };

  const updateEmailConfig = (field: string, value: string) => {
    // Auto-trim password and strip invisible chars
    const cleanValue = field === 'password' ? value.replace(/\s+/g, '') : value.trim();
    setLocalSettings(prev => ({
      ...prev,
      email: { ...prev.email, [field]: cleanValue }
    }));
    setIsDirty(true);
  };

  const updateLocalConfig = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      local: { ...prev.local, [field]: value }
    }));
    setIsDirty(true);
  };

  const updateApiConfig = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      api: { ...prev.api, [field]: value }
    }));
    setIsDirty(true);
  };

  const updateHybridConfig = (field: string, value: string | boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      hybrid: { ...prev.hybrid, [field]: value }
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    // 验证 API Key
    // 验证 API Key
    if (aiMode === 'api' && !localSettings.api.key) {
      toast.error(t('settings.api_key_required') || 'API模式需要填写 API Key');
      return;
    }
    if (aiMode === 'hybrid' && !localSettings.hybrid.api_key) {
      toast.error(t('settings.api_key_required') || '混合模式需要填写 API Key');
      return;
    }

    // Update global theme context
    setTheme(localSettings.theme);
    setLanguage(localSettings.language);
    // Save to parent component
    onSave({ ...localSettings, ai_mode: aiMode });
    setIsDirty(false);
    toast.success('设置已保存');
    onClose();
  };

  const handleTestConnection = async (type: string) => {
    setTestingConnection(type);
    toast.info(`正在测试${type}连接...`);

    try {
      let result: any;
      if (type === '邮箱') {
        // Only send password if it's been changed (not empty)
        const testParams: { imap_server?: string; email?: string; password?: string } = {
          imap_server: localSettings.email.imap_server,
          email: localSettings.email.email,
        };
        if (localSettings.email.password && localSettings.email.password !== '***') {
          testParams.password = localSettings.email.password;
        }
        result = await testIMAPConnection(testParams);
      } else if (type === 'Ollama') {
        result = await testLocalAIConnection();
      } else if (type === 'API') {
        result = await testAPIConnection();
      }

      if (result && result.success) {
        toast.success(`${type}连接测试成功`);
      } else {
        toast.error(`${type}连接失败`, {
          description: result?.message || '未知错误'
        });
      }
    } catch (error) {
      toast.error(`${type}连接异常`, {
        description: String(error)
      });
    } finally {
      setTestingConnection(null);
    }
  };

  // 本地模式配置面板
  const LocalConfigPanel = () => (
    <div
      className="animate-fade-in-up space-y-4 rounded-xl p-4 border settings-section-card"
    >
      <div className="space-y-2.5">
        <Label className="form-label" style={{ color: 'var(--light-ink)' }}>本地模型</Label>
        <Select
          value={localSettings.local.model}
          onValueChange={(v) => updateLocalConfig('model', v)}
        >
          <SelectTrigger
            className="h-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCAL_MODELS.map(model => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="form-label settings-label">{t('settings.host_address')}</Label>
        <div className="relative">
          <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--dry-ink)' }} />
          <Input
            value={localSettings.local.host}
            onChange={(e) => updateLocalConfig('host', e.target.value)}
            placeholder="http://localhost:11434"
            className="h-10 pl-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleTestConnection('Ollama')}
        disabled={testingConnection === 'Ollama'}
        className="h-9 px-4 text-sm font-medium rounded-lg border-gray-200 hover:bg-white transition-all"
        style={{ color: 'var(--light-ink)' }}
      >
        {testingConnection === 'Ollama' ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <TestTube className="w-4 h-4 mr-1.5" />
        )}
        {t('action.test_ollama')}
      </Button>
    </div>
  );

  // API模式配置面板
  const ApiConfigPanel = () => (
    <div
      className="animate-fade-in-up space-y-4 rounded-xl p-4 border settings-section-card"
    >
      <div className="space-y-2.5">
        <Label className="form-label settings-label">{t('settings.api_provider')}</Label>
        <Select
          value={localSettings.api.provider}
          onValueChange={(v) => updateApiConfig('provider', v as APIProvider)}
        >
          <SelectTrigger
            className="h-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {API_PROVIDERS.map(provider => (
              <SelectItem key={provider.value} value={provider.value}>
                {provider.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="form-label settings-label">{t('settings.model')}</Label>
        <Select
          value={localSettings.api.model}
          onValueChange={(v) => updateApiConfig('model', v)}
        >
          <SelectTrigger
            className="h-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {API_MODELS[localSettings.api.provider].map(model => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="form-label" style={{ color: 'var(--light-ink)' }}>API Key</Label>
        <Input
          type="password"
          value={localSettings.api.key}
          onChange={(e) => updateApiConfig('key', e.target.value)}
          placeholder="sk-..."
          className="h-10 rounded-lg border-gray-200"
          style={{ backgroundColor: 'var(--ivory-white)' }}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleTestConnection('API')}
        disabled={testingConnection === 'API'}
        className="h-9 px-4 text-sm font-medium rounded-lg border-gray-200 hover:bg-white transition-all"
        style={{ color: 'var(--light-ink)' }}
      >
        {testingConnection === 'API' ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <TestTube className="w-4 h-4 mr-1.5" />
        )}
        {t('action.test_connection')}
      </Button>
    </div>
  );

  // 混合模式配置面板
  const HybridConfigPanel = () => (
    <div
      className="animate-fade-in-up space-y-4 rounded-xl p-4 border settings-section-card"
    >
      <div className="space-y-2.5">
        <Label className="form-label" style={{ color: 'var(--light-ink)' }}>本地模型</Label>
        <Select
          value={localSettings.hybrid.local_model}
          onValueChange={(v) => updateHybridConfig('local_model', v)}
        >
          <SelectTrigger
            className="h-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCAL_MODELS.map(model => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="form-label settings-label">{t('settings.api_provider')}</Label>
        <Select
          value={localSettings.hybrid.api_provider}
          onValueChange={(v) => updateHybridConfig('api_provider', v as APIProvider)}
        >
          <SelectTrigger
            className="h-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {API_PROVIDERS.map(provider => (
              <SelectItem key={provider.value} value={provider.value}>
                {provider.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="form-label settings-label">{t('settings.model')}</Label>
        <Select
          value={localSettings.hybrid.api_model}
          onValueChange={(v) => updateHybridConfig('api_model', v)}
        >
          <SelectTrigger
            className="h-10 rounded-lg border-gray-200"
            style={{ backgroundColor: 'var(--ivory-white)' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {API_MODELS[localSettings.hybrid.api_provider].map(model => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2.5">
        <Label className="form-label" style={{ color: 'var(--light-ink)' }}>API Key</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={localSettings.hybrid.api_key}
          onChange={(e) => updateHybridConfig('api_key', e.target.value)}
          placeholder="sk-..."
          className="h-10 rounded-lg border-gray-200"
          style={{ backgroundColor: 'var(--ivory-white)' }}
        />
      </div>
      <div className="flex items-center space-x-3 py-2">
        <Checkbox
          id="confirm"
          checked={localSettings.hybrid.confirm_before_api}
          onCheckedChange={(checked) =>
            updateHybridConfig('confirm_before_api', checked as boolean)
          }
          className="rounded border-gray-300"
        />
        <Label htmlFor="confirm" className="text-sm cursor-pointer settings-label">
          {t('settings.confirm_ask')}
        </Label>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent
        className="w-[440px] p-0 overflow-hidden settings-modal-content"
      >
        {/* 顶部色条 */}
        <div style={{ height: '3px', backgroundColor: URGENCY_COLORS.indigo.main }} />

        {/* 头部区域 */}
        <SheetHeader className="px-5 py-4 border-b settings-modal-content">
          <SheetTitle className="flex items-center gap-3 text-lg font-semibold" style={{ color: 'var(--pine-ink)' }}>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
            >
              <Bot className="w-5 h-5" style={{ color: URGENCY_COLORS.indigo.main }} />
            </div>
            {t('settings.title')}
          </SheetTitle>
        </SheetHeader>

        {/* 内容区 */}
        <div
          className="px-5 py-5 space-y-6 overflow-y-auto custom-scrollbar settings-modal-content"
          style={{ maxHeight: 'calc(100vh - 140px)' }}
        >

          {/* 邮箱配置 */}
          <div className="animate-fade-in-up stagger-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
              >
                <Mail className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider settings-section-title">{t('settings.email_config')}</h3>
            </div>

            <div
              className="rounded-xl p-4 space-y-4 border settings-section-card"
            >
              <div className="space-y-2">
                <Label className="form-label settings-label">{t('settings.imap_server')}</Label>
                <Input
                  value={localSettings.email.imap_server}
                  onChange={(e) => updateEmailConfig('imap_server', e.target.value)}
                  placeholder="imap.example.com"
                  className="h-10 rounded-lg border-gray-200"
                  style={{ backgroundColor: 'var(--withered-white)' }}
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label settings-label">{t('settings.email_address')}</Label>
                <Input
                  value={localSettings.email.email}
                  onChange={(e) => updateEmailConfig('email', e.target.value)}
                  placeholder="student@school.edu"
                  className="h-10 rounded-lg border-gray-200"
                  style={{ backgroundColor: 'var(--withered-white)' }}
                />
              </div>
              <div className="space-y-2">
                <Label className="form-label settings-label">{t('settings.password')}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    id="email-password-input"
                    name="email-password-input"
                    value={localSettings.email.password}
                    onChange={(e) => updateEmailConfig('password', e.target.value)}
                    placeholder={t('settings.placeholder.password')}
                    className="h-10 pr-10 rounded-lg border-gray-200"
                    style={{ backgroundColor: 'var(--ivory-white)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection('邮箱')}
                disabled={testingConnection === '邮箱'}
                className="h-9 px-4 text-sm font-medium rounded-lg border-gray-200 hover:bg-white transition-all"
                style={{ color: 'var(--light-ink)' }}
              >
                {testingConnection === '邮箱' ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-1.5" />
                )}
                {t('action.test_connection')}
              </Button>
            </div>
          </div>

          {/* AI模式选择 */}
          <div className="animate-fade-in-up stagger-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
              >
                <Bot className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider settings-section-title">{t('settings.ai_mode')}</h3>
            </div>

            {/* 卡片式Radio */}
            <div className="space-y-2.5">
              {radioOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = aiMode === option.value;

                return (
                  <div
                    key={option.value}
                    onClick={() => setAiMode(option.value)}
                    className="relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 radio-card"
                    style={{
                      borderColor: isSelected ? URGENCY_COLORS.indigo.main : '',
                    }}
                  >
                    {/* 左侧选中指示条 */}
                    {isSelected && (
                      <div
                        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                        style={{ backgroundColor: URGENCY_COLORS.indigo.main }}
                      />
                    )}

                    {/* 图标 */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? 'rgba(122, 154, 168, 0.15)' : 'rgba(122, 154, 168, 0.08)',
                        color: isSelected ? URGENCY_COLORS.indigo.main : '#9B9B9B'
                      }}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold radio-title">{t(`mode.${option.value}`)}</span>
                        {option.badge && (
                          <span
                            className="px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider"
                            style={{ backgroundColor: URGENCY_COLORS.indigo.light, color: URGENCY_COLORS.indigo.main }}
                          >
                            {t('badge.recommended')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 radio-desc">{t(`mode.${option.value}_desc`)}</p>
                    </div>

                    {/* 选中标记 */}
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 mt-0.5"
                      style={{
                        borderColor: isSelected ? URGENCY_COLORS.indigo.main : '#D0CCC4',
                        backgroundColor: isSelected ? URGENCY_COLORS.indigo.main : 'transparent'
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 动态配置面板 */}
            <div className="mt-3">
              {aiMode === 'local' && <LocalConfigPanel />}
              {aiMode === 'api' && <ApiConfigPanel />}
              {aiMode === 'hybrid' && <HybridConfigPanel />}
            </div>
          </div>

          {/* 界面设置 */}
          <div className="animate-fade-in-up stagger-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
              >
                <Palette className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider settings-section-title">{t('settings.interface')}</h3>
            </div>

            <div
              className="rounded-xl p-4 border settings-section-card"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="form-label settings-label">{t('settings.theme')}</Label>
                  <Select
                    value={localSettings.theme}
                    onValueChange={(v) => setLocalSettings(prev => ({ ...prev, theme: v as 'light' | 'dark' }))}
                  >
                    <SelectTrigger
                      className="h-10 rounded-lg border-gray-200"
                      style={{ backgroundColor: 'var(--withered-white)' }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.theme_light')}</SelectItem>
                      <SelectItem value="dark">{t('settings.theme_dark')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="form-label settings-label">{t('settings.language')}</Label>
                  <Select
                    value={localSettings.language}
                    onValueChange={(v) => setLocalSettings(prev => ({ ...prev, language: v as 'zh' | 'en' }))}
                  >
                    <SelectTrigger
                      className="h-10 rounded-lg border-gray-200"
                      style={{ backgroundColor: 'var(--withered-white)' }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 开发者工具 */}
            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await exportTestReport();
                    toast.success('测试报告已导出');
                  } catch (e) {
                    toast.error('导出失败', { description: String(e) });
                  }
                }}
                className="w-full h-9 rounded-lg text-xs"
                style={{ color: 'var(--light-ink)' }}
              >
                📊 导出测试报告 (JSON)
              </Button>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 py-4 flex gap-3 border-t settings-modal-content"
        >
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border-gray-200 hover:bg-gray-50 btn-secondary-fix"
            style={{ color: 'var(--light-ink)' }}
          >
            {t('action.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-10 rounded-xl text-white"
            style={{ backgroundColor: URGENCY_COLORS.indigo.main }}
          >
            {t('action.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
