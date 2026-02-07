import { useState, useMemo } from 'react';
import { Archive, Trash2, Clock, Paperclip } from 'lucide-react';
import type { Email, FilterType } from '@/types';
import { URGENCY_COLORS } from '@/types';

interface EmailListSectionProps {
  emails: Email[];
  onEmailClick: (email: Email) => void;
  onArchive: (id: string) => void;
  onDelete?: (id: string) => void;
}

const FILTER_OPTIONS: { value: FilterType; label: string; tag: string }[] = [
  { value: 'all', label: '全部', tag: '' },
  { value: 'urgent', label: '紧急', tag: '🔴' },
  { value: 'warning', label: '重要', tag: '🟡' },
  { value: 'normal', label: '日常', tag: '🟢' },
];

export function EmailListSection({ emails, onEmailClick, onArchive, onDelete }: EmailListSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // 筛选和排序邮件
  const filteredEmails = useMemo(() => {
    let filtered = emails;
    if (activeFilter !== 'all') {
      filtered = emails.filter(e => e.urgency === activeFilter);
    }
    // 按紧急度排序：urgent > warning > normal > archived
    const urgencyOrder = { urgent: 0, warning: 1, normal: 2, archived: 3 };
    return filtered.sort((a, b) => {
      const orderDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (orderDiff !== 0) return orderDiff;
      // 同紧急度按时间倒序
      return 0; // 保持原有顺序
    });
  }, [emails, activeFilter]);

  // 获取紧急度样式
  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'urgent';
      case 'warning': return 'warning';
      case 'normal': return 'normal';
      default: return '';
    }
  };

  // 获取Tag颜色
  const getTagColor = (tag: string) => {
    switch (tag) {
      case '🔴': return URGENCY_COLORS.urgent.main;
      case '🟡': return URGENCY_COLORS.warning.main;
      case '🟢': return URGENCY_COLORS.normal.main;
      case '⚪': return URGENCY_COLORS.archived.main;
      default: return URGENCY_COLORS.normal.main;
    }
  };

  return (
    <div className="space-y-4">
      {/* 标题栏 + 筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}>
            <svg className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#2A2A2A' }}>邮件列表</h3>
            <p className="text-xs" style={{ color: '#9B9B9B' }}>共 {emails.length} 封</p>
          </div>
        </div>

        {/* 筛选胶囊 */}
        <div className="flex items-center gap-2">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`filter-pill ${filter.value} ${activeFilter === filter.value ? 'active' : ''}`}
            >
              {filter.tag && <span className="mr-1">{filter.tag}</span>}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 邮件列表 */}
      <div className="space-y-2">
        {filteredEmails.map((email, index) => (
          <div
            key={email.id}
            onClick={() => onEmailClick(email)}
            className={`
              email-row animate-fade-in-up
              ${getUrgencyClass(email.urgency)}
              ${email.is_read ? 'read' : ''}
            `}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {/* 左侧：Tag + 主题 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Tag */}
              <span 
                className="text-base flex-shrink-0"
                style={{ color: getTagColor(email.tag) }}
              >
                {email.tag}
              </span>
              
              {/* 主题 */}
              <span className={`email-subject text-sm truncate ${email.is_read ? '' : 'font-medium'}`} style={{ color: email.is_read ? '#9B9B9B' : '#2A2A2A' }}>
                {email.subject}
              </span>
              
              {/* 附件标识 */}
              {email.has_attachments && (
                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9B9B9B' }} />
              )}
            </div>

            {/* 中间：发件人 */}
            <div className="flex items-center gap-2 mx-4 flex-shrink-0" style={{ width: '100px' }}>
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                style={{ backgroundColor: getTagColor(email.tag) + '99' }}
              >
                {email.sender_name.charAt(0)}
              </div>
              <span className="text-xs truncate" style={{ color: '#6B6B6B' }}>
                {email.sender_name}
              </span>
            </div>

            {/* 右侧：时间 + 操作 */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* 时间 */}
              <div className="flex items-center gap-1 text-xs" style={{ color: '#9B9B9B', width: '50px' }}>
                <Clock className="w-3 h-3" />
                <span>{email.time}</span>
              </div>

              {/* 操作按钮（Hover显示） */}
              <div className="email-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(email.id);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: '#6B6B6B' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = URGENCY_COLORS.indigo.main}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6B6B6B'}
                  title="归档"
                >
                  <Archive className="w-4 h-4" />
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(email.id);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: '#6B6B6B' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = URGENCY_COLORS.urgent.main}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#6B6B6B'}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filteredEmails.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(122, 154, 168, 0.08)' }}>
            <svg className="w-8 h-8" style={{ color: URGENCY_COLORS.indigo.main }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: '#9B9B9B' }}>暂无邮件</p>
        </div>
      )}
    </div>
  );
}
