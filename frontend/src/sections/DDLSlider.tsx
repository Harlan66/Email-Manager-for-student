import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { UrgentDDL } from '@/types';
import { URGENCY_COLORS } from '@/types';

interface DDLSliderProps {
  ddlList: UrgentDDL[];
  onDDLClick?: (ddl: UrgentDDL) => void;
  onViewMore?: () => void;
}

export function DDLSlider({ ddlList, onDDLClick, onViewMore }: DDLSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 180;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getDDLClass = (daysLeft: number) => {
    if (daysLeft <= 3) return 'urgent';
    if (daysLeft <= 7) return 'warning';
    return 'normal';
  };

  const visibleDDLs = ddlList.slice(0, 4);
  const hasMore = ddlList.length > 4;

  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: URGENCY_COLORS.urgent.main }}>
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: '#2A2A2A' }}>
            紧急且临近DDL
          </span>
        </div>
        <button 
          onClick={onViewMore}
          className="text-xs flex items-center gap-1 transition-colors hover:opacity-70"
          style={{ color: URGENCY_COLORS.indigo.main }}
        >
          <Calendar className="w-3.5 h-3.5" />
          查看日历
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* 横向滑块 */}
      <div className="relative group">
        {/* 左箭头 */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(254, 253, 249, 0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: '#6B6B6B' }} />
        </button>

        {/* 滚动区域 */}
        <div
          ref={scrollRef}
          className="ddl-scroll-container"
        >
          {visibleDDLs.map((ddl) => {
            const ddlClass = getDDLClass(ddl.days_left);
            const color = URGENCY_COLORS[ddlClass === 'urgent' ? 'urgent' : ddlClass === 'warning' ? 'warning' : 'normal'];
            
            return (
              <div
                key={ddl.id}
                onClick={() => onDDLClick?.(ddl)}
                className={`ddl-card ${ddlClass}`}
              >
                <span className="text-xs font-medium px-2 py-0.5 rounded-full mb-2" 
                  style={{ 
                    backgroundColor: color.main + '20',
                    color: color.main 
                  }}
                >
                  {ddl.tag}
                </span>
                <span className="text-sm font-medium text-center px-3 line-clamp-1" style={{ color: '#2A2A2A' }}>
                  {ddl.title}
                </span>
                <span 
                  className="text-xs font-semibold mt-1.5"
                  style={{ color: color.main }}
                >
                  剩{ddl.days_left}天{ddl.days_left <= 2 ? '!' : ''}
                </span>
              </div>
            );
          })}

          {/* 更多入口 */}
          {hasMore && (
            <div
              onClick={onViewMore}
              className="ddl-card normal flex flex-col items-center justify-center cursor-pointer"
              style={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: '#7A9AA8' }}
            >
              <span className="text-lg font-bold" style={{ color: URGENCY_COLORS.indigo.main }}>
                +{ddlList.length - 4}
              </span>
              <span className="text-xs mt-1" style={{ color: '#6B6B6B' }}>
                更多
              </span>
            </div>
          )}
        </div>

        {/* 右箭头 */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(254, 253, 249, 0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: '#6B6B6B' }} />
        </button>
      </div>
    </div>
  );
}
