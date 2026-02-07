import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Language = 'zh' | 'en';

interface ThemeContextType {
    theme: Theme;
    language: Language;
    setTheme: (theme: Theme) => void;
    setLanguage: (language: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    zh: {
        // 导航和标题
        'app.title': '邮箱管理',
        'nav.overview': '概览',
        'nav.settings': '设置',
        'nav.help': '帮助',
        'nav.notifications': '通知',
        'nav.sync': '同步',

        // 概览卡片
        'card.today_deadline': '今日截止',
        'card.pending_reply': '待回复',
        'card.pending_attachment': '附件待理',
        'card.empty_deadline': '今日无事',
        'card.empty_deadline_sub': '斋中静坐',
        'card.empty_reply': '无欠于外',
        'card.empty_reply_sub': '尺牍已复',
        'card.empty_attachment': '物已归位',
        'card.empty_attachment_sub': '无附件待理',
        'card.action_handle': '立即处理',
        'card.action_reply': '快捷回复',
        'card.action_view': '查看附件',

        // 时间范围
        'time.today': '今日',
        'time.week': '本周',
        'time.month': '本月',
        'time.all': '全部',

        // 邮件列表
        'email.total': '封邮件',
        'email.urgent': '紧急',
        'email.important': '重要',
        'email.normal': '日常',
        'email.archived': '归档',
        'email.read': '已读',
        'email.unread': '未读',
        'email.attachment': '附件',
        'email.deadline': '截止',

        // DDL滑块
        'ddl.title': '紧急DDL',
        'ddl.view_all': '查看全部',
        'ddl.days_left': '天后',
        'ddl.today': '今天',
        'ddl.tomorrow': '明天',

        // 设置面板
        'settings.title': '设置',
        'settings.email_config': '邮箱配置',
        'settings.imap_server': 'IMAP服务器',
        'settings.email_address': '邮箱地址',
        'settings.password': '应用密码',
        'settings.test_connection': '测试连接',
        'settings.ai_mode': 'AI模式选择',
        'settings.local': '本地',
        'settings.local_desc': '100%本地Ollama，零网络请求',
        'settings.api': 'API',
        'settings.api_desc': '100%云端API，高准确率',
        'settings.hybrid': '混合',
        'settings.hybrid_desc': '简单任务本地，复杂任务API',
        'settings.recommended': '推荐',
        'settings.provider': '服务商',
        'settings.model': '模型',
        'settings.api_key': 'API Key',
        'settings.interface': '界面设置',
        'settings.theme': '主题',
        'settings.theme_light': '浅色',
        'settings.theme_dark': '深色',
        'settings.language': '语言',
        'settings.save': '保存设置',
        'settings.cancel': '取消',

        // 操作反馈
        'toast.sync_success': '同步完成',
        'toast.sync_error': '同步失败',
        'settings.confirm_ask': 'API任务前询问确认',
        'toast.settings_saved': '设置已保存',
        'toast.connection_success': '连接测试成功',
        'toast.demo_mode': '演示模式',
        'toast.demo_desc': '后端未运行，使用示例数据',

        // V4 新增翻译 (用户反馈)
        'app.subtitle': '智能邮件助手',
        'action.sync': '同步',
        'action.view_calendar': '查看日历',
        'action.more': '更多',
        'action.test_connection': '测试连接',
        'action.test_ollama': '测试Ollama连接',
        'action.cancel': '取消',
        'action.save': '保存设置',

        'overview.title': '概览',

        'filter.today': '今日',
        'filter.week': '本周',
        'filter.month': '本月',
        'filter.all': '全部',
        'filter.urgent': '紧急',
        'filter.important': '重要',
        'filter.normal': '日常',

        'ddl.section_title': '紧急且临近DDL',

        'email_list.title': '邮件列表',
        'email_list.count': '共 {count} 封',

        'settings.app_password': '应用密码',
        'settings.local_model': '本地模型',
        'settings.host_address': '主机地址',
        'settings.api_provider': 'API服务商',

        'mode.local': '本地',
        'mode.api': 'API',
        'mode.hybrid': '混合',
        'mode.local_desc': '100%本地Ollama，零网络请求',
        'mode.api_desc': '100%云端API，高准确率',
        'mode.hybrid_desc': '简单任务本地，复杂任务API',

        'badge.recommended': '推荐',
    },
    en: {
        // Navigation and titles
        'app.title': 'Email Manager',
        'app.subtitle': 'Smart Email Assistant', // V4
        'nav.overview': 'Overview',
        'nav.settings': 'Settings',
        'nav.help': 'Help',
        'nav.notifications': 'Notifications',
        'nav.sync': 'Sync',

        // Overview cards
        'card.today_deadline': 'Due Today',
        'card.pending_reply': 'Pending Reply',
        'card.pending_attachment': 'Attachments',
        'card.empty_deadline': 'All Clear',
        'card.empty_deadline_sub': 'A moment of peace', // V4 Poetic
        'card.empty_reply': 'Inbox Harmony', // V4 Poetic
        'card.empty_reply_sub': 'All correspondence tended', // V4 Poetic
        'card.empty_attachment': 'All Artifacts Archived', // V4 Poetic
        'card.empty_attachment_sub': 'No loose ends', // V4 Poetic
        'card.action_handle': 'Handle Now',
        'card.action_reply': 'Quick Reply',
        'card.action_view': 'View Files',

        // Time ranges
        'time.today': 'Today',
        'time.week': 'Week',
        'time.month': 'Month',
        'time.all': 'All',

        // Email list
        'email.total': 'emails',
        'email.urgent': 'Urgent',
        'email.important': 'Important',
        'email.normal': 'Normal',
        'email.archived': 'Archived',
        'email.read': 'Read',
        'email.unread': 'Unread',
        'email.attachment': 'Attachment',
        'email.deadline': 'Due',

        // DDL slider
        'ddl.title': 'Urgent DDL',
        'ddl.view_all': 'View All',
        'ddl.days_left': 'days',
        'ddl.today': 'Today',
        'ddl.tomorrow': 'Tomorrow',

        // Settings panel
        'settings.title': 'Settings',
        'settings.email_config': 'Email Configuration',
        'settings.imap_server': 'IMAP Server',
        'settings.email_address': 'Email Address',
        'settings.password': 'App Password',
        'settings.test_connection': 'Test Connection',
        'settings.ai_mode': 'AI Mode',
        'settings.local': 'Local',
        'settings.local_desc': '100% Local Ollama, zero network', // V4
        'settings.api': 'API',
        'settings.api_desc': '100% Cloud API, high accuracy', // V4
        'settings.hybrid': 'Hybrid',
        'settings.hybrid_desc': 'Local for simple, API for complex', // V4
        'settings.recommended': 'Recommended',
        'settings.provider': 'Provider',
        'settings.model': 'Model',
        'settings.api_key': 'API Key',
        'settings.interface': 'Interface Settings',
        'settings.theme': 'Theme',
        'settings.theme_light': 'Light',
        'settings.theme_dark': 'Dark',
        'settings.language': 'Language',
        'settings.save': 'Save Settings',
        'settings.cancel': 'Cancel',

        // Toast messages
        'toast.sync_success': 'Sync Complete',
        'toast.sync_error': 'Sync Failed',
        'settings.confirm_ask': 'Ask before API task',
        'toast.settings_saved': 'Settings Saved',
        'toast.connection_success': 'Connection Test Successful',
        'toast.demo_mode': 'Demo Mode',
        'toast.demo_desc': 'Backend not running, using sample data',

        // V4 New Keys
        'action.sync': 'Sync',
        'action.view_calendar': 'View Calendar',
        'action.more': 'more',
        'action.test_connection': 'Test Connection',
        'action.test_ollama': 'Test Ollama Connection',
        'action.cancel': 'Cancel',
        'action.save': 'Save Settings',

        'overview.title': 'Overview',

        'filter.today': 'Today',
        'filter.week': 'Week',
        'filter.month': 'Month',
        'filter.all': 'All',
        'filter.urgent': 'Urgent',
        'filter.important': 'Important',
        'filter.normal': 'Normal',

        'ddl.section_title': 'Urgent & Upcoming',

        'email_list.title': 'Inbox',
        'email_list.count': '{count} emails',

        'settings.app_password': 'App Password',
        'settings.local_model': 'Local Model',
        'settings.host_address': 'Host Address',
        'settings.api_provider': 'Provider',

        'mode.local': 'Local',
        'mode.api': 'API',
        'mode.hybrid': 'Hybrid',
        'mode.local_desc': '100% Local Ollama, zero network',
        'mode.api_desc': '100% Cloud API, high accuracy',
        'mode.hybrid_desc': 'Local for simple, API for complex',

        'badge.recommended': 'Recommended',
    },
};

// CSS变量主题配置
const themeVariables: Record<Theme, Record<string, string>> = {
    light: {
        '--bg-primary': '#F5F1E8',
        '--bg-secondary': '#FEFDF9',
        '--bg-tertiary': '#FAF8F3',
        '--border-primary': '#E8E4DB',
        '--border-secondary': '#D0CCC4',
        '--text-primary': '#2A2A2A',
        '--text-secondary': '#6B6B6B',
        '--text-muted': '#9B9B9B',
        '--accent-red': '#C45A4A',
        '--accent-yellow': '#D4A574',
        '--accent-blue': '#7A9AA8',
        '--accent-red-light': 'rgba(196, 90, 74, 0.08)',
        '--accent-yellow-light': 'rgba(212, 165, 116, 0.08)',
        '--accent-blue-light': 'rgba(122, 154, 168, 0.08)',
    },
    dark: {
        '--bg-primary': '#0D0D0D',   // 焦墨 - 页面背景
        '--bg-secondary': '#1A1A1A', // 浓墨 - 卡片背景
        '--bg-tertiary': '#141414',  // 重墨 - 列表/次要背景
        '--border-primary': '#2A2A2A', // 清墨 - 分割线
        '--border-secondary': '#404040',
        '--text-primary': '#E8E6E3', // 米白 - 主文字
        '--text-secondary': '#A0A0A0', // 淡银 - 次要文字
        '--text-muted': '#666666',   // 灰墨 - 弱化文字
        '--accent-red': '#E88373',   // 珊瑚红 - 柔和强调
        '--accent-yellow': '#F0C495', // 蜜蜡黄 - 温暖提示
        '--accent-blue': '#A8C8D8',  // 月白蓝 - 清冷提示
        '--accent-red-light': 'rgba(232, 131, 115, 0.15)',
        '--accent-yellow-light': 'rgba(240, 196, 149, 0.15)',
        '--accent-blue-light': 'rgba(168, 200, 216, 0.15)',
    },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'light';
    });

    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('language');
        return (saved as Language) || 'zh';
    });

    // 应用主题CSS变量
    useEffect(() => {
        const root = document.documentElement;
        const variables = themeVariables[theme];

        Object.entries(variables).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // 添加class到body用于额外样式控制
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);

        localStorage.setItem('theme', theme);
    }, [theme]);

    // 保存语言设置
    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.lang = language;
    }, [language]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const setLanguage = (newLanguage: Language) => {
        setLanguageState(newLanguage);
    };

    // 翻译函数
    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <ThemeContext.Provider value={{ theme, language, setTheme, setLanguage, t }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
