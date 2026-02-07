import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { HelpCircle, Mail, Bot, Shield, Keyboard, Calendar, Rocket } from 'lucide-react';
import { URGENCY_COLORS } from '@/types';

interface HelpGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const helpSections = [
    {
        icon: Rocket,
        title: '快速开始',
        items: [
            '1. 双击运行 EmailManager.exe 启动后端服务',
            '2. 在设置中配置邮箱IMAP和AI模式',
            '3. 点击「同步」获取邮件'
        ]
    },
    {
        icon: Mail,
        title: '邮箱同步',
        content: '点击顶部「同步」按钮拉取最新邮件。首次使用请在设置中配置IMAP服务器地址和应用密码（非邮箱登录密码）。'
    },
    {
        icon: Bot,
        title: 'AI 分类',
        items: [
            '🔴 紧急 — 3天内截止的DDL、考试通知等',
            '🟡 重要 — 作业、成绩、注册相关',
            '🟢 日常 — 一般通知、活动邀请',
            '⚪ 归档 — 确认邮件、已过期内容'
        ]
    },
    {
        icon: Shield,
        title: '隐私保护',
        content: '系统会自动检测邮件中的敏感信息（如身份证号、银行账号等）。检测到高隐私内容时，将自动切换为本地AI处理，确保数据安全。'
    },
    {
        icon: Calendar,
        title: 'DDL 管理',
        content: 'AI会自动从邮件中提取截止日期。DDL滑块展示近期待办，点击可查看详情。使用日历视图获得更直观的时间分布。'
    },
    {
        icon: Keyboard,
        title: '快捷操作',
        items: [
            '点击邮件 → 自动标记为已读',
            '右滑邮件 → 标记已读',
            '左滑邮件 → 归档邮件',
            '点击DDL卡片 → 跳转到对应邮件'
        ]
    }
];

export function HelpGuide({ isOpen, onClose }: HelpGuideProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-md p-0 overflow-hidden max-h-[80vh]"
                style={{ backgroundColor: '#FEFDF9', border: '1px solid #E8E4DB' }}
            >
                {/* 顶部色条 */}
                <div style={{ height: '3px', backgroundColor: URGENCY_COLORS.indigo.main }} />

                <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: '#E8E4DB' }}>
                    <DialogTitle className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
                        >
                            <HelpCircle className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
                        </div>
                        <span style={{ color: '#2A2A2A' }}>使用指南</span>
                    </DialogTitle>
                </DialogHeader>

                <div
                    className="px-5 py-4 space-y-5 overflow-y-auto custom-scrollbar"
                    style={{ maxHeight: 'calc(80vh - 80px)' }}
                >
                    {helpSections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-6 h-6 rounded-md flex items-center justify-center"
                                        style={{ backgroundColor: 'rgba(122, 154, 168, 0.1)' }}
                                    >
                                        <Icon className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.indigo.main }} />
                                    </div>
                                    <h3 className="text-sm font-semibold" style={{ color: '#2A2A2A' }}>
                                        {section.title}
                                    </h3>
                                </div>

                                {section.content && (
                                    <p className="text-sm leading-relaxed pl-8" style={{ color: '#6B6B6B' }}>
                                        {section.content}
                                    </p>
                                )}

                                {section.items && (
                                    <ul className="space-y-1.5 pl-8">
                                        {section.items.map((item, i) => (
                                            <li
                                                key={i}
                                                className="text-sm"
                                                style={{ color: '#6B6B6B' }}
                                            >
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}

                    {/* 版本信息 */}
                    <div
                        className="pt-4 mt-4 border-t text-center"
                        style={{ borderColor: '#E8E4DB' }}
                    >
                        <p className="text-xs" style={{ color: '#9B9B9B' }}>
                            Email Manager v1.0.0 · 东方美学设计
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
