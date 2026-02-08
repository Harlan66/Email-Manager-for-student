import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, CalendarDays } from 'lucide-react';
import type { UrgentDDL } from '@/types';
import { URGENCY_COLORS } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    ddlList: UrgentDDL[];
    onDDLClick: (ddl: UrgentDDL) => void;
}

export function CalendarModal({ isOpen, onClose, ddlList, onDDLClick }: CalendarModalProps) {
    const { t, language } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Localized weekdays and months
    const WEEKDAYS = language === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = language === 'zh'
        ? ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 获取当月第一天是星期几
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // 获取当月有多少天
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // 获取上个月有多少天
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // 解析DDL日期，返回Map<日期字符串, DDL列表>
    const ddlByDate = new Map<string, UrgentDDL[]>();
    ddlList.forEach(ddl => {
        const dateKey = ddl.deadline.split('T')[0]; // YYYY-MM-DD
        if (!ddlByDate.has(dateKey)) {
            ddlByDate.set(dateKey, []);
        }
        ddlByDate.get(dateKey)!.push(ddl);
    });

    // 生成日历格子
    const calendarDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

    // 上个月的日期填充
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        calendarDays.push({
            day,
            isCurrentMonth: false,
            dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        });
    }

    // 当月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push({
            day,
            isCurrentMonth: true,
            dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        });
    }

    // 下个月的日期填充（填满6行）
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        calendarDays.push({
            day,
            isCurrentMonth: false,
            dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        });
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // 获取日期的DDL指示点颜色
    const getDDLIndicators = (dateStr: string) => {
        const ddls = ddlByDate.get(dateStr) || [];
        return ddls.map(ddl => {
            if (ddl.urgency === 'urgent') return URGENCY_COLORS.urgent.main;
            if (ddl.urgency === 'warning') return URGENCY_COLORS.warning.main;
            return URGENCY_COLORS.normal.main;
        }).slice(0, 3); // 最多显示3个指示点
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-2xl p-0 overflow-hidden"
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
                            <Calendar className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
                        </div>
                        <span style={{ color: '#2A2A2A' }}>{t('calendar.title')}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-5">
                    {/* 月份导航 */}
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPrevMonth}
                            className="h-8 w-8 rounded-lg"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold" style={{ color: '#2A2A2A' }}>
                                {currentDate.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToToday}
                                className="h-7 px-2 text-xs rounded-md"
                                style={{ borderColor: '#E8E4DB' }}
                            >
                                {t('calendar.today')}
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextMonth}
                            className="h-8 w-8 rounded-lg"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* 星期头部 */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAYS.map((day, i) => (
                            <div
                                key={day}
                                className="h-8 flex items-center justify-center text-xs font-medium"
                                style={{ color: i === 0 || i === 6 ? URGENCY_COLORS.urgent.main : '#9B9B9B' }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* 日历格子 */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((dayInfo, index) => {
                            const indicators = getDDLIndicators(dayInfo.dateStr);
                            const isToday = dayInfo.dateStr === todayStr;
                            const isSelected = selectedDate === dayInfo.dateStr;

                            return (
                                <div
                                    key={index}
                                    onClick={() => setSelectedDate(dayInfo.dateStr)}
                                    className="relative h-10 flex flex-col items-center justify-center rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-100"
                                    style={{
                                        backgroundColor: isSelected
                                            ? URGENCY_COLORS.indigo.main
                                            : isToday
                                                ? 'rgba(122, 154, 168, 0.15)'
                                                : 'transparent',
                                        color: isSelected
                                            ? '#FFFFFF'
                                            : dayInfo.isCurrentMonth
                                                ? (isToday ? URGENCY_COLORS.indigo.main : '#2A2A2A')
                                                : '#D0CCC4',
                                        fontWeight: isToday || isSelected ? 600 : 400,
                                    }}
                                >
                                    <span className="text-sm">{dayInfo.day}</span>

                                    {/* DDL指示点 */}
                                    {indicators.length > 0 && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {indicators.map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* DDL列表预览 */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E8E4DB' }}>
                        {/* 显示选中日期的DDL或即将到期的DDL */}
                        {(() => {
                            const selectedDDLs = selectedDate ? (ddlByDate.get(selectedDate) || []) : [];
                            const showSelectedDate = selectedDate && selectedDDLs.length > 0;
                            const displayList = showSelectedDate ? selectedDDLs : ddlList.slice(0, 5);

                            return (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {showSelectedDate ? (
                                                <CalendarDays className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
                                            ) : (
                                                <Clock className="w-4 h-4" style={{ color: '#9B9B9B' }} />
                                            )}
                                            <span className="text-xs font-medium" style={{ color: '#6B6B6B' }}>
                                                {showSelectedDate
                                                    ? t('calendar.ddl_on_date').replace('{date}', selectedDate || '').replace('{count}', String(selectedDDLs.length))
                                                    : t('calendar.upcoming_ddl').replace('{count}', String(ddlList.length))
                                                }
                                            </span>
                                        </div>
                                        {showSelectedDate && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedDate(null)}
                                                className="h-6 px-2 text-xs"
                                                style={{ color: '#9B9B9B' }}
                                            >
                                                {t('calendar.view_all')}
                                            </Button>
                                        )}
                                    </div>

                                    {displayList.length > 0 ? (
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {displayList.map(ddl => (
                                                <div
                                                    key={ddl.id}
                                                    onClick={() => onDDLClick(ddl)}
                                                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                                >
                                                    <div
                                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: URGENCY_COLORS[ddl.urgency].main }}
                                                    />
                                                    <span className="text-sm flex-1 truncate" style={{ color: '#2A2A2A' }}>
                                                        {ddl.title}
                                                    </span>
                                                    <span
                                                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                                                        style={{
                                                            backgroundColor: URGENCY_COLORS[ddl.urgency].light,
                                                            color: URGENCY_COLORS[ddl.urgency].main
                                                        }}
                                                    >
                                                        {ddl.days_left === 0 ? t('calendar.days_left_0') : ddl.days_left === 1 ? t('calendar.days_left_1') : t('calendar.days_left_n').replace('{n}', String(ddl.days_left))}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4" style={{ color: '#9B9B9B' }}>
                                            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">{t('calendar.no_ddl')}</p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
