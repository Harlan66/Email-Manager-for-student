import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Copy, 
  CheckCircle, 
  Archive, 
  Tag,
  Bot,
  FileText,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import type { Email } from '@/types';
import { TAG_CONFIG, URGENCY_COLORS } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';

interface EmailDetailModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
}

export function EmailDetailModal({ 
  email, 
  isOpen, 
  onClose, 
  onMarkAsRead, 
  onArchive 
}: EmailDetailModalProps) {
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  if (!email) return null;

  const tagConfig = TAG_CONFIG[email.tag];

  const handleCopyBody = () => {
    navigator.clipboard.writeText(email.body);
    toast.success('邮件正文已复制到剪贴板');
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(email.id);
    toast.success('已标记为已读');
  };

  const handleArchive = () => {
    onArchive(email.id);
    onClose();
    toast.success('邮件已归档');
  };

  // 计算剩余天数
  const getDaysLeft = (deadline: string) => {
    const today = new Date('2026-02-06');
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl border-0"
        style={{ backgroundColor: '#FEFDF9', border: '1px solid #E8E4DB' }}
      >
        {/* 顶部色条 */}
        <div 
          className="h-1 w-full"
          style={{ backgroundColor: tagConfig.color }}
        />
        
        <div className="p-5 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 4px)' }}>
          <DialogHeader className="mb-4">
            <DialogTitle 
              className="text-lg font-semibold leading-tight pr-4"
              style={{ color: '#2A2A2A' }}
            >
              {email.subject}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 基本信息卡片 */}
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: '#FAF8F3' }}
            >
              {/* Tag */}
              <div className="flex items-center gap-2 mb-3">
                <Badge 
                  variant="outline" 
                  className="text-sm px-3 py-1 rounded-lg font-medium border-0"
                  style={{ 
                    color: tagConfig.color,
                    backgroundColor: tagConfig.bgColor 
                  }}
                >
                  {email.tag} {tagConfig.label}
                </Badge>
                {!email.is_read && (
                  <Badge 
                    className="rounded-lg border-0"
                    style={{ backgroundColor: URGENCY_COLORS.indigo.light, color: URGENCY_COLORS.indigo.main }}
                  >
                    未读
                  </Badge>
                )}
              </div>

              {/* 发件人信息 */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: tagConfig.color + 'CC' }}
                >
                  {email.sender_name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium" style={{ color: '#2A2A2A' }}>{email.sender_name}</div>
                  <div className="text-sm flex items-center gap-1" style={{ color: '#6B6B6B' }}>
                    <Mail className="w-3.5 h-3.5" />
                    {email.sender_email}
                  </div>
                </div>
                <div className="ml-auto text-sm flex items-center gap-1" style={{ color: '#9B9B9B' }}>
                  <Clock className="w-3.5 h-3.5" />
                  {email.time}
                </div>
              </div>
            </div>

            {/* DDL信息 */}
            {email.has_deadline && email.deadline && (
              <div 
                className="rounded-xl p-4 border"
                style={{ 
                  backgroundColor: getDaysLeft(email.deadline) <= 3 ? 'rgba(196, 90, 74, 0.06)' : 'rgba(212, 165, 116, 0.08)',
                  borderColor: getDaysLeft(email.deadline) <= 3 ? 'rgba(196, 90, 74, 0.2)' : 'rgba(212, 165, 116, 0.25)'
                }}
              >
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: getDaysLeft(email.deadline) <= 3 ? 'rgba(196, 90, 74, 0.12)' : 'rgba(212, 165, 116, 0.15)'
                      }}
                    >
                      <Calendar 
                        className="w-4 h-4"
                        style={{ color: getDaysLeft(email.deadline) <= 3 ? URGENCY_COLORS.urgent.main : URGENCY_COLORS.warning.main }}
                      />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider" style={{ color: '#9B9B9B' }}>截止日期</div>
                      <div className="font-semibold" style={{ color: '#2A2A2A' }}>{email.deadline} 23:59</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: getDaysLeft(email.deadline) <= 3 ? 'rgba(196, 90, 74, 0.12)' : 'rgba(212, 165, 116, 0.15)'
                      }}
                    >
                      <Clock 
                        className="w-4 h-4"
                        style={{ color: getDaysLeft(email.deadline) <= 3 ? URGENCY_COLORS.urgent.main : URGENCY_COLORS.warning.main }}
                      />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider" style={{ color: '#9B9B9B' }}>剩余时间</div>
                      <div 
                        className="font-semibold"
                        style={{ color: getDaysLeft(email.deadline) <= 3 ? URGENCY_COLORS.urgent.main : URGENCY_COLORS.warning.main }}
                      >
                        {getDaysLeft(email.deadline)} 天
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI摘要 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: URGENCY_COLORS.indigo.main }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6B6B' }}>AI摘要</span>
              </div>
              <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: 'rgba(122, 154, 168, 0.05)', border: '1px solid rgba(122, 154, 168, 0.1)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: '#2A2A2A' }}>{email.summary}</p>
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#FAF8F3' }}
                >
                  <Tag className="w-3.5 h-3.5" style={{ color: '#6B6B6B' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6B6B' }}>标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {email.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-xs px-3 py-1 rounded-lg border-0"
                    style={{ backgroundColor: '#FAF8F3', color: '#6B6B6B' }}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* AI处理信息 */}
            <div 
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: '#FAF8F3' }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(122, 154, 168, 0.12)' }}
              >
                <Bot className="w-4 h-4" style={{ color: URGENCY_COLORS.indigo.main }} />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider" style={{ color: '#9B9B9B' }}>处理方式</div>
                <div className="text-sm font-medium" style={{ color: '#2A2A2A' }}>{email.ai_model}</div>
              </div>
              <CheckCircle className="w-5 h-5" style={{ color: URGENCY_COLORS.normal.main }} />
            </div>

            <div className="divider-ochre" style={{ margin: '16px 0' }} />

            {/* 邮件正文 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#FAF8F3' }}
                  >
                    <FileText className="w-3.5 h-3.5" style={{ color: '#6B6B6B' }} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6B6B' }}>邮件正文</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                  className="h-7 px-2"
                  style={{ color: '#9B9B9B' }}
                >
                  {isBodyExpanded ? (
                    <><ChevronUp className="w-4 h-4 mr-1" /> 收起</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-1" /> 展开</>
                  )}
                </Button>
              </div>
              <div 
                className={`rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${isBodyExpanded ? '' : 'line-clamp-4'}`}
                style={{ backgroundColor: '#FAF8F3', color: '#2A2A2A' }}
              >
                {email.body}
              </div>
            </div>

            <div className="divider-ochre" style={{ margin: '16px 0' }} />

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyBody}
                className="h-9 px-4 rounded-xl border-gray-200 hover:bg-gray-50"
                style={{ color: '#6B6B6B' }}
              >
                <Copy className="w-4 h-4 mr-2" />
                复制正文
              </Button>
              {!email.is_read && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-9 px-4 rounded-xl border-gray-200 hover:bg-gray-50"
                  style={{ color: URGENCY_COLORS.indigo.main, borderColor: 'rgba(122, 154, 168, 0.3)' }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  标记已读
                </Button>
              )}
              {!email.is_archived && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleArchive}
                  className="h-9 px-4 rounded-xl border-gray-200 hover:bg-gray-50 ml-auto"
                  style={{ color: '#6B6B6B' }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  归档
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
