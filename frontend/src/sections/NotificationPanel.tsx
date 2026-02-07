import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, Clock, Mail, AlertCircle } from 'lucide-react';
import { URGENCY_COLORS } from '@/types';

interface Notification {
    id: string;
    type: 'sync' | 'deadline' | 'email' | 'system';
    title: string;
    message: string;
    time: string;
    isRead: boolean;
}

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// 演示通知数据
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'deadline',
        title: 'DDL 提醒',
        message: '「数据结构作业3」将在明天截止',
        time: '5分钟前',
        isRead: false
    },
    {
        id: '2',
        type: 'sync',
        title: '同步完成',
        message: '已获取 3 封新邮件',
        time: '15分钟前',
        isRead: false
    },
    {
        id: '3',
        type: 'email',
        title: '新邮件',
        message: '来自教务处的重要通知',
        time: '1小时前',
        isRead: true
    },
    {
        id: '4',
        type: 'system',
        title: '系统更新',
        message: 'Email Manager 已更新到 v1.0.0',
        time: '2小时前',
        isRead: true
    }
];

const typeConfig = {
    sync: { icon: Clock, color: URGENCY_COLORS.indigo.main, bg: URGENCY_COLORS.indigo.light },
    deadline: { icon: AlertCircle, color: URGENCY_COLORS.urgent.main, bg: URGENCY_COLORS.urgent.light },
    email: { icon: Mail, color: URGENCY_COLORS.warning.main, bg: URGENCY_COLORS.warning.light },
    system: { icon: Bell, color: '#9B9B9B', bg: 'rgba(155, 155, 155, 0.08)' }
};

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                className="w-[380px] p-0 overflow-hidden"
                style={{ backgroundColor: '#F5F1E8' }}
            >
                {/* 顶部色条 */}
                <div style={{ height: '3px', backgroundColor: URGENCY_COLORS.indigo.main }} />

                <SheetHeader className="px-5 py-4 border-b" style={{ backgroundColor: '#FEFDF9', borderColor: '#E8E4DB' }}>
                    <SheetTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center relative"
                                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
                            >
                                <Bell className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
                                {unreadCount > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                                        style={{ backgroundColor: URGENCY_COLORS.urgent.main }}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <span style={{ color: '#2A2A2A' }}>通知</span>
                        </div>

                        {notifications.length > 0 && (
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="h-7 px-2 text-xs"
                                    style={{ color: '#6B6B6B' }}
                                >
                                    <Check className="w-3 h-3 mr-1" />
                                    全部已读
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    className="h-7 px-2 text-xs"
                                    style={{ color: '#9B9B9B' }}
                                >
                                    清空
                                </Button>
                            </div>
                        )}
                    </SheetTitle>
                </SheetHeader>

                <div
                    className="overflow-y-auto custom-scrollbar"
                    style={{ maxHeight: 'calc(100vh - 80px)', backgroundColor: '#F5F1E8' }}
                >
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16" style={{ color: '#9B9B9B' }}>
                            <Bell className="w-12 h-12 mb-4 opacity-30" />
                            <p className="text-sm">暂无通知</p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {notifications.map(notification => {
                                const config = typeConfig[notification.type];
                                const Icon = config.icon;

                                return (
                                    <div
                                        key={notification.id}
                                        className="relative rounded-xl p-4 border transition-all duration-200 hover:shadow-sm"
                                        style={{
                                            backgroundColor: notification.isRead ? '#FAF8F3' : '#FEFDF9',
                                            borderColor: notification.isRead ? '#E8E4DB' : config.color,
                                            borderLeftWidth: notification.isRead ? '1px' : '3px'
                                        }}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: config.bg }}
                                            >
                                                <Icon className="w-4 h-4" style={{ color: config.color }} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span
                                                        className="text-sm font-medium"
                                                        style={{ color: '#2A2A2A' }}
                                                    >
                                                        {notification.title}
                                                    </span>
                                                    <span className="text-xs" style={{ color: '#9B9B9B' }}>
                                                        {notification.time}
                                                    </span>
                                                </div>
                                                <p
                                                    className="text-sm truncate"
                                                    style={{ color: '#6B6B6B' }}
                                                >
                                                    {notification.message}
                                                </p>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 flex-shrink-0"
                                                style={{ color: '#9B9B9B' }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        {!notification.isRead && (
                                            <div
                                                className="absolute top-3 right-3 w-2 h-2 rounded-full"
                                                style={{ backgroundColor: config.color }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
