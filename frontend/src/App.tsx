import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, HelpCircle, Mail, Bell, RefreshCw, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { OverviewSection } from '@/sections/OverviewSection';
import { DDLSlider } from '@/sections/DDLSlider';
import { EmailListSection } from '@/sections/EmailListSection';
import { EmailDetailModal } from '@/sections/EmailDetailModal';
import { SettingsPanel } from '@/sections/SettingsPanel';
import { CalendarModal } from '@/sections/CalendarModal';
import { HelpGuide } from '@/sections/HelpGuide';
import { NotificationPanel } from '@/sections/NotificationPanel';
import { SyncProgressModal } from '@/components/SyncProgressModal';
import {
  urgentDDLList,
  emailList as mockEmailList,
  defaultSettings
} from '@/data/mockData';
import * as api from '@/services/api';
import type {
  Email,
  TimeRange,
  SettingsConfig,
  UrgentDDL
} from '@/types';
import { URGENCY_COLORS } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import './App.css';

function App() {
  const { t } = useTheme();
  // 状态管理
  const [emails, setEmails] = useState<Email[]>(mockEmailList);
  const [urgentDDLs, setUrgentDDLs] = useState<UrgentDDL[]>(urgentDDLList);
  const [settings, setSettings] = useState<SettingsConfig>(defaultSettings);

  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);

  // 弹窗状态
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSyncProgressOpen, setIsSyncProgressOpen] = useState(false);

  // 检查API可用性并加载初始数据
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        // 检查后端是否可用
        const apiHealthy = await api.checkApiHealth();
        setIsApiAvailable(apiHealthy);

        if (apiHealthy) {
          // 从API加载数据
          const [emailsData, ddlData, settingsData] = await Promise.all([
            api.fetchEmails({ is_archived: false }),
            api.fetchDDL(),
            api.fetchSettings().catch(() => defaultSettings)
          ]);

          // Empty arrays are valid - user just has no emails yet
          setEmails(emailsData);
          setUrgentDDLs(ddlData);
          setSettings(settingsData);

          toast.success('数据加载完成', { description: '已连接到后端服务' });
        } else {
          // 使用mock数据
          toast.info('演示模式', { description: '后端未运行，使用示例数据' });
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        toast.error('加载失败', { description: '使用示例数据' });
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const refreshData = useCallback(async () => {
    if (!isApiAvailable) {
      return;
    }

    try {
      const [emailsData, ddlData] = await Promise.all([
        api.fetchEmails({ is_archived: false }),
        api.fetchDDL()
      ]);

      // Don't fallback to mock - empty is valid (user has no emails yet)
      setEmails(emailsData);
      setUrgentDDLs(ddlData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [isApiAvailable]);

  // 同步邮件 - 使用进度弹窗
  const handleSync = useCallback(async () => {
    console.log('[handleSync] isApiAvailable:', isApiAvailable);
    if (!isApiAvailable) {
      toast.info('演示模式', { description: '请先运行 EmailManager.exe 启动后端服务' });
      return;
    }
    console.log('[handleSync] opening sync progress modal');
    setIsSyncProgressOpen(true);
  }, [isApiAvailable]);

  // 同步完成回调
  const handleSyncComplete = useCallback(async (result: { success: boolean; message: string; synced: number; processed: number }) => {
    setIsSyncProgressOpen(false);

    // Always refresh data regardless of success/failure
    // This ensures any emails that were synced before an error are shown
    await refreshData();

    if (result.success) {
      toast.success(result.message, { description: `AI处理: ${result.processed} 封` });
    } else {
      toast.error(result.message);
    }
  }, [refreshData]);

  // 处理时间粒度切换
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    toast.info(`已切换到: ${range}`);
  }, []);

  // 处理邮件点击 - 自动标记已读
  const handleEmailClick = useCallback(async (email: Email) => {
    setSelectedEmail(email);
    setIsDetailModalOpen(true);

    // 如果邮件未读，自动标记为已读
    if (!email.is_read) {
      // 本地立即更新
      setEmails(prev =>
        prev.map(e =>
          e.id === email.id ? { ...e, is_read: true } : e
        )
      );
      setSelectedEmail({ ...email, is_read: true });

      // 同步到后端
      if (isApiAvailable) {
        try {
          await api.markAsRead(email.id);
        } catch (error) {
          console.error('Error marking as read:', error);
        }
      }
    }
  }, [isApiAvailable]);

  // 处理DDL点击
  const handleDDLClick = useCallback((ddl: UrgentDDL) => {
    // 找到对应的邮件
    const relatedEmail = emails.find(e => e.subject.includes(ddl.title) || ddl.title.includes(e.subject.split(' ')[0]));
    if (relatedEmail) {
      setSelectedEmail(relatedEmail);
      setIsDetailModalOpen(true);
    } else {
      toast.info(`DDL: ${ddl.title}`, {
        description: `截止: ${ddl.deadline}，剩${ddl.days_left}天`
      });
    }
  }, [emails]);

  // 处理标记已读
  const handleMarkAsRead = useCallback(async (id: string) => {
    // 本地立即更新
    setEmails(prev =>
      prev.map(email =>
        email.id === id ? { ...email, is_read: true } : email
      )
    );
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail({ ...selectedEmail, is_read: true });
    }

    // 同步到后端
    if (isApiAvailable) {
      try {
        await api.markAsRead(id);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  }, [selectedEmail, isApiAvailable]);

  // 处理归档
  const handleArchive = useCallback(async (id: string) => {
    // 本地立即更新
    setEmails(prev =>
      prev.map(email =>
        email.id === id ? { ...email, is_archived: true } : email
      )
    );
    toast.success('邮件已归档');

    // 同步到后端
    if (isApiAvailable) {
      try {
        await api.archiveEmail(id);
      } catch (error) {
        console.error('Error archiving:', error);
      }
    }
  }, [isApiAvailable]);

  // 处理删除
  const handleDelete = useCallback(async (id: string) => {
    // 本地立即更新
    setEmails(prev => prev.filter(email => email.id !== id));
    toast.success('邮件已删除');

    // 同步到后端
    if (isApiAvailable) {
      try {
        await api.deleteEmail(id);
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  }, [isApiAvailable]);

  // 处理设置保存
  const handleSettingsSave = useCallback(async (newSettings: SettingsConfig) => {
    setSettings(newSettings);

    // 同步到后端
    if (isApiAvailable) {
      try {
        await api.saveSettings(newSettings);
        toast.success('设置已保存');
      } catch (error) {
        console.error('Error saving settings:', error);
        toast.error('保存设置失败');
      }
    }
  }, [isApiAvailable]);

  // 打开帮助
  const handleHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  // 过滤未归档的邮件
  const activeEmails = emails.filter(email => !email.is_archived);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: URGENCY_COLORS.indigo.main }} />
            <p className="text-sm" style={{ color: '#6B6B6B' }}>正在加载...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            backgroundColor: '#FEFDF9',
            border: '1px solid #E8E4DB',
            color: '#2A2A2A',
          },
        }}
      />

      {/* 主容器 */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* 顶部标题栏 */}
        <header className="ivory-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: URGENCY_COLORS.indigo.main }}
            >
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#2A2A2A', letterSpacing: '-0.3px' }}>
                {t('app.title')}
              </h1>
              <p className="text-xs" style={{ color: '#9B9B9B' }}>
                {isApiAvailable ? t('app.subtitle') : t('toast.demo_mode')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSyncProgressOpen}
              className="h-9 px-3 rounded-xl hover:bg-gray-100 transition-all"
              title={t('nav.sync')}
            >
              {isSyncProgressOpen ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6B6B6B' }} />
              ) : (
                <RefreshCw className="w-4 h-4" style={{ color: '#6B6B6B' }} />
              )}
              <span className="ml-1.5 text-sm hidden sm:inline">{t('nav.sync')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHelp}
              className="w-9 h-9 p-0 rounded-xl hover:bg-gray-100"
            >
              <HelpCircle className="w-4 h-4" style={{ color: '#6B6B6B' }} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNotificationOpen(true)}
              className="w-9 h-9 p-0 rounded-xl hover:bg-gray-100 relative"
            >
              <Bell className="w-4 h-4" style={{ color: '#6B6B6B' }} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsPanelOpen(true)}
              className="h-9 px-3 rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
            >
              <Settings className="w-4 h-4 mr-1.5" style={{ color: '#6B6B6B' }} />
              <span className="text-sm">{t('nav.settings')}</span>
            </Button>
          </div>
        </header>

        {/* 概览区 */}
        <section className="ivory-card p-5 animate-fade-in-up stagger-1">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
            >
              <svg className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.indigo.main }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold" style={{ color: '#2A2A2A' }}>{t('overview.title')}</h2>
          </div>
          <OverviewSection
            onTimeRangeChange={handleTimeRangeChange}
            onEmailClick={(emailId) => {
              const email = emails.find(e => e.id === emailId);
              if (email) handleEmailClick(email);
            }}
          />
        </section>

        {/* DDL横向滑块 */}
        <section className="ivory-card p-5 animate-fade-in-up stagger-2">
          <DDLSlider
            ddlList={urgentDDLs}
            onDDLClick={handleDDLClick}
            onViewMore={() => setIsCalendarOpen(true)}
          />
        </section>

        {/* 邮件列表 */}
        <section className="ivory-card p-5 animate-fade-in-up stagger-3">
          <EmailListSection
            emails={activeEmails}
            onEmailClick={handleEmailClick}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </section>

        {/* 底部信息 */}
        <footer className="text-center py-3">
          <p className="text-xs" style={{ color: '#9B9B9B' }}>
            Email-Manager · {t('mode.local')} · {t('badge.recommended')}
          </p>
        </footer>
      </div>

      {/* 详情弹窗 */}
      <EmailDetailModal
        email={selectedEmail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEmail(null);
        }}
        onMarkAsRead={handleMarkAsRead}
        onArchive={handleArchive}
      />

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        settings={settings}
        onSave={handleSettingsSave}
      />

      {/* 日历弹窗 */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        ddlList={urgentDDLs}
        onDDLClick={handleDDLClick}
      />

      {/* 帮助指南 */}
      <HelpGuide
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* 通知面板 */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* 同步进度 */}
      <SyncProgressModal
        isOpen={isSyncProgressOpen}
        onComplete={handleSyncComplete}
        days={40}
      />
    </div>
  );
}

export default App;
