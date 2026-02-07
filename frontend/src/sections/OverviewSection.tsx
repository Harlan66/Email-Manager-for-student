import { useState, useEffect } from 'react';
import { Clock, Mail, Paperclip, ArrowRight } from 'lucide-react';
import type { TimeRange } from '@/types';
import { TIME_RANGES } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

// 东方美学色彩
const COLORS = {
  朱砂红: { main: '#C45A4A', bg: 'rgba(196, 90, 74, 0.08)', border: 'rgba(196, 90, 74, 0.3)' },
  青黛蓝: { main: '#7A9AA8', bg: 'rgba(122, 154, 168, 0.08)', border: 'rgba(122, 154, 168, 0.3)' },
  藤黄: { main: '#D4A574', bg: 'rgba(212, 165, 116, 0.08)', border: 'rgba(212, 165, 116, 0.3)' },
};

// 行动卡片数据类型
interface TodayDeadlineCard {
  has_data: boolean;
  email_id: string | null;
  title: string;
  deadline_time: string;
  empty_text: string;
  empty_subtext: string;
}

interface PendingReplyCard {
  has_data: boolean;
  email_id: string | null;
  sender_name: string;
  waiting_time: string;
  empty_text: string;
  empty_subtext: string;
}

interface PendingAttachmentCard {
  has_data: boolean;
  email_id: string | null;
  title: string;
  attachment_info: string;
  empty_text: string;
  empty_subtext: string;
}

interface ActionCardsData {
  today_deadline: TodayDeadlineCard;
  pending_reply: PendingReplyCard;
  pending_attachment: PendingAttachmentCard;
  current_date: string;
}

interface OverviewSectionProps {
  onTimeRangeChange: (range: TimeRange) => void;
  onEmailClick?: (emailId: string) => void;
}

// 默认空数据
const defaultData: ActionCardsData = {
  today_deadline: {
    has_data: false,
    email_id: null,
    title: '',
    deadline_time: '',
    empty_text: '今日无事',
    empty_subtext: '斋中静坐'
  },
  pending_reply: {
    has_data: false,
    email_id: null,
    sender_name: '',
    waiting_time: '',
    empty_text: '无欠于外',
    empty_subtext: '尺牍已复'
  },
  pending_attachment: {
    has_data: false,
    email_id: null,
    title: '',
    attachment_info: '',
    empty_text: '物已归位',
    empty_subtext: '无附件待理'
  },
  current_date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
};

export function OverviewSection({
  onTimeRangeChange,
  onEmailClick
}: OverviewSectionProps) {
  const { t, language } = useTheme();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('本周');
  const [cardsData, setCardsData] = useState<ActionCardsData>(defaultData);

  // 加载行动卡片数据
  useEffect(() => {
    const fetchActionCards = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/stats/action-cards');
        if (response.ok) {
          const data = await response.json();
          setCardsData(data);
        }
      } catch (error) {
        console.log('Using default action cards data');
      }
    };

    fetchActionCards();
    // 每5分钟刷新一次
    const interval = setInterval(fetchActionCards, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    onTimeRangeChange(range);
  };

  const handleCardClick = (emailId: string | null) => {
    if (emailId && onEmailClick) {
      onEmailClick(emailId);
    }
  };

  // 行动卡片通用样式
  const cardStyle = (color: typeof COLORS.朱砂红, hasData: boolean): React.CSSProperties => ({
    height: '140px',
    backgroundColor: 'var(--bg-secondary)', // Use CSS variable
    border: '1px solid var(--border-primary)', // Use CSS variable
    borderRadius: '16px',
    borderTop: `3px solid ${color.main}`,
    padding: '16px 20px',
    cursor: hasData ? 'pointer' : 'default',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  });

  return (
    <div className="space-y-5">
      {/* 时间粒度选择器 */}
      <div className="flex items-center justify-between">
        <div className="time-selector">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              className={selectedRange === range ? 'active' : ''}
            >
              {t(`time.${range === '今日' ? 'today' : range === '本周' ? 'week' : range === '本月' ? 'month' : 'all'}`)}
            </button>
          ))}
        </div>

        {/* 当前时间显示 */}
        <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </div>
      </div>

      {/* 行动卡片 - 东方美学设计 */}
      <div className="grid grid-cols-3 gap-4">

        {/* 卡片A: 今日截止 (朱砂红) */}
        <div
          style={cardStyle(COLORS.朱砂红, cardsData.today_deadline.has_data)}
          className="action-card hover:translate-y-[-2px] hover:shadow-lg"
          onClick={() => handleCardClick(cardsData.today_deadline.email_id)}
        >
          <div>
            <div className="flex items-center gap-2 mb-2" style={{ borderBottom: `1px solid ${COLORS.朱砂红.border}`, paddingBottom: '8px' }}>
              <Clock className="w-4 h-4" style={{ color: COLORS.朱砂红.main }} />
              <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>{t('card.today_deadline')}</span>
            </div>
            {cardsData.today_deadline.has_data ? (
              <div className="mt-3">
                <div className="text-base font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {cardsData.today_deadline.title}
                </div>
                <div className="text-sm mt-1" style={{ color: COLORS.朱砂红.main, fontFamily: '"Noto Serif SC", serif' }}>
                  {cardsData.today_deadline.deadline_time}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ color: 'var(--text-muted)' }}>
                <div className="text-sm font-medium">{t('card.empty_deadline')}</div>
                <div className="text-xs mt-1 opacity-70">{t('card.empty_deadline_sub')}</div>
              </div>
            )}
          </div>
          {cardsData.today_deadline.has_data && (
            <div className="flex items-center gap-1 text-sm action-btn" style={{ color: COLORS.朱砂红.main, opacity: 0.8 }}>
              <span>{t('card.action_handle')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* 卡片B: 待回复 (青黛蓝) */}
        <div
          style={cardStyle(COLORS.青黛蓝, cardsData.pending_reply.has_data)}
          className="action-card hover:translate-y-[-2px] hover:shadow-lg"
          onClick={() => handleCardClick(cardsData.pending_reply.email_id)}
        >
          <div>
            <div className="flex items-center gap-2 mb-2" style={{ borderBottom: `1px solid ${COLORS.青黛蓝.border}`, paddingBottom: '8px' }}>
              <Mail className="w-4 h-4" style={{ color: COLORS.青黛蓝.main }} />
              <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>{t('card.pending_reply')}</span>
            </div>
            {cardsData.pending_reply.has_data ? (
              <div className="mt-3">
                <div className="text-base font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {cardsData.pending_reply.sender_name}
                </div>
                <div className="text-sm mt-1 font-mono" style={{ color: COLORS.青黛蓝.main }}>
                  {cardsData.pending_reply.waiting_time}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ color: 'var(--text-muted)' }}>
                <div className="text-sm font-medium">{t('card.empty_reply')}</div>
                <div className="text-xs mt-1 opacity-70">{t('card.empty_reply_sub')}</div>
              </div>
            )}
          </div>
          {cardsData.pending_reply.has_data && (
            <div className="flex items-center gap-1 text-sm action-btn" style={{ color: COLORS.青黛蓝.main, opacity: 0.8 }}>
              <span>{t('card.action_reply')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* 卡片C: 附件待理 (藤黄) */}
        <div
          style={cardStyle(COLORS.藤黄, cardsData.pending_attachment.has_data)}
          className="action-card hover:translate-y-[-2px] hover:shadow-lg"
          onClick={() => handleCardClick(cardsData.pending_attachment.email_id)}
        >
          <div>
            <div className="flex items-center gap-2 mb-2" style={{ borderBottom: `1px solid ${COLORS.藤黄.border}`, paddingBottom: '8px' }}>
              <Paperclip className="w-4 h-4" style={{ color: COLORS.藤黄.main }} />
              <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>{t('card.pending_attachment')}</span>
            </div>
            {cardsData.pending_attachment.has_data ? (
              <div className="mt-3">
                <div className="text-base font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {cardsData.pending_attachment.title}
                </div>
                <div className="text-sm mt-1" style={{ color: COLORS.藤黄.main }}>
                  {cardsData.pending_attachment.attachment_info}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ color: 'var(--text-muted)' }}>
                <div className="text-sm font-medium">{t('card.empty_attachment')}</div>
                <div className="text-xs mt-1 opacity-70">{t('card.empty_attachment_sub')}</div>
              </div>
            )}
          </div>
          {cardsData.pending_attachment.has_data && (
            <div className="flex items-center gap-1 text-sm action-btn" style={{ color: COLORS.藤黄.main, opacity: 0.8 }}>
              <span>{t('card.action_view')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
