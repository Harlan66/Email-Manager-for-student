"""
Database operations for Email-Manager.
SQLite database with async support using aiosqlite.
"""
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import contextmanager

from .models import (
    Email, EmailTag, UrgencyLevel, Priority, AIMode, PrivacyLevel,
    OverviewData, TimeRange, UrgentDDL,
    priority_to_tag, priority_to_urgency
)
from .utils.date_parser import format_relative_time, calculate_days_left


from .utils.paths import get_base_dir


class Database:
    """SQLite database manager for Email-Manager."""
    
    DB_PATH = get_base_dir() / "email_manager.db"
    
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or self.DB_PATH
        self.init_db()
    
    @contextmanager
    def get_connection(self):
        """Get a database connection with context manager."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def init_db(self):
        """Initialize database tables."""
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS emails (
                    id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    sender_email TEXT NOT NULL,
                    sender_name TEXT,
                    date_received TIMESTAMP NOT NULL,
                    body_text TEXT,
                    body_html TEXT,
                    priority TEXT DEFAULT 'normal',
                    tags TEXT,
                    summary TEXT,
                    deadline TEXT,
                    ai_processed INTEGER DEFAULT 0,
                    ai_model TEXT,
                    ai_mode TEXT,
                    privacy_level TEXT DEFAULT 'normal',
                    is_read INTEGER DEFAULT 0,
                    is_archived INTEGER DEFAULT 0,
                    has_attachments INTEGER DEFAULT 0,
                    attachment_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    needs_reply INTEGER DEFAULT 0
                )
            """)
            
            # Migration: Ensure needs_reply column exists for old databases
            try:
                conn.execute("SELECT needs_reply FROM emails LIMIT 1")
            except Exception:
                try:
                    conn.execute("ALTER TABLE emails ADD COLUMN needs_reply INTEGER DEFAULT 0")
                    print("Database migration: Added 'needs_reply' column.")
                except Exception as e:
                    print(f"Database migration failed: {e}")
            
            # Create indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date_received)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_emails_priority ON emails(priority)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_emails_archived ON emails(is_archived)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_emails_deadline ON emails(deadline)")
            
            # Create sync_history table for tracking sync sessions
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sync_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sync_started_at TIMESTAMP NOT NULL,
                    sync_completed_at TIMESTAMP,
                    sync_type TEXT NOT NULL,
                    days_range INTEGER,
                    emails_synced INTEGER DEFAULT 0,
                    emails_processed INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'in_progress',
                    error_message TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sync_history_started ON sync_history(sync_started_at)")
    
    def save_email(self, email: Email) -> bool:
        """Save or update an email in the database."""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO emails (
                    id, subject, sender_email, sender_name, date_received,
                    body_text, body_html, priority, tags, summary, deadline,
                    ai_processed, ai_model, ai_mode, privacy_level,
                    is_read, is_archived, has_attachments, attachment_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                email.id,
                email.subject,
                email.sender_email,
                email.sender_name,
                email.date_received.isoformat() if email.date_received else None,
                email.body,
                email.body_html,
                email.priority.value,
                json.dumps(email.tags),
                email.summary,
                email.deadline,
                int(email.ai_processed),
                email.ai_model,
                email.ai_mode.value if email.ai_mode else None,
                email.privacy_level.value,
                int(email.is_read),
                int(email.is_archived),
                int(email.has_attachments),
                email.attachment_count
            ))
        return True
    
    def get_email(self, email_id: str) -> Optional[Email]:
        """Get a single email by ID."""
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM emails WHERE id = ?", (email_id,)
            ).fetchone()
            
            if row:
                return self._row_to_email(dict(row))
        return None
    
    def email_exists(self, email_id: str) -> bool:
        """Check if an email exists in the database."""
        with self.get_connection() as conn:
            result = conn.execute(
                "SELECT 1 FROM emails WHERE id = ?", (email_id,)
            ).fetchone()
            return result is not None
    
    def get_urgent_emails(self, limit: int = 5) -> List[Email]:
        """Get emails that need reply or are urgent."""
        with self.get_connection() as conn:
            # 优先获取需要回复的邮件，其次是紧急邮件
            rows = conn.execute("""
                SELECT * FROM emails 
                WHERE (needs_reply = 1 OR priority IN ('urgent', 'important')) AND is_archived = 0
                ORDER BY date_received DESC
                LIMIT ?
            """, (limit,)).fetchall()
            
            return [self._row_to_email(dict(row)) for row in rows]

    def get_emails(
        self,
        time_range: TimeRange = TimeRange.ALL,
        priority: Optional[Priority] = None,
        is_archived: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Email]:
        """Get emails with filtering."""
        conditions = []
        params: List[Any] = []
        
        # Time range filter
        if time_range != TimeRange.ALL:
            start_date = self._get_time_range_start(time_range)
            if start_date:
                conditions.append("date_received >= ?")
                params.append(start_date.isoformat())
        
        # Priority filter
        if priority:
            conditions.append("priority = ?")
            params.append(priority.value)
        
        # Archived filter
        if is_archived is not None:
            conditions.append("is_archived = ?")
            params.append(int(is_archived))
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        with self.get_connection() as conn:
            query = f"""
                SELECT * FROM emails
                WHERE {where_clause}
                ORDER BY date_received DESC
                LIMIT ? OFFSET ?
            """
            params.extend([limit, offset])
            rows = conn.execute(query, params).fetchall()
            
            return [self._row_to_email(dict(row)) for row in rows]
    
    def get_stats(self, time_range: TimeRange = TimeRange.WEEK) -> OverviewData:
        """Get statistics for overview section."""
        start_date = self._get_time_range_start(time_range)
        
        with self.get_connection() as conn:
            # Total emails in time range
            if start_date:
                total = conn.execute(
                    "SELECT COUNT(*) FROM emails WHERE date_received >= ? AND is_archived = 0",
                    (start_date.isoformat(),)
                ).fetchone()[0]
            else:
                total = conn.execute(
                    "SELECT COUNT(*) FROM emails WHERE is_archived = 0"
                ).fetchone()[0]
            
            # Urgent DDL count (priority = urgent AND has deadline within 7 days)
            now = datetime.now()
            deadline_threshold = (now + timedelta(days=7)).strftime("%Y-%m-%d")
            
            urgent_ddl = conn.execute("""
                SELECT COUNT(*) FROM emails 
                WHERE priority = 'urgent' 
                AND deadline IS NOT NULL 
                AND deadline <= ?
                AND is_archived = 0
            """, (deadline_threshold,)).fetchone()[0]
            
            # Near deadline count (any email with deadline within 7 days)
            near_deadline = conn.execute("""
                SELECT COUNT(*) FROM emails 
                WHERE deadline IS NOT NULL 
                AND deadline <= ?
                AND is_archived = 0
            """, (deadline_threshold,)).fetchone()[0]
        
        return OverviewData(
            total=total,
            urgent_ddl=urgent_ddl,
            near_deadline=near_deadline,
            time_range=time_range
        )
    
    def get_urgent_ddl(self, days: int = 7) -> List[UrgentDDL]:
        """Get urgent DDL items for top notification area.
        Only shows deadlines that are today or in the future (within 'days' days).
        """
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        deadline_threshold = (now + timedelta(days=days)).strftime("%Y-%m-%d")
        
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT id, subject, deadline, priority FROM emails 
                WHERE deadline IS NOT NULL 
                AND deadline >= ?
                AND deadline <= ?
                AND is_archived = 0
                ORDER BY deadline ASC
                LIMIT 10
            """, (today_str, deadline_threshold,)).fetchall()
            
            ddl_list = []
            for row in rows:
                row_dict = dict(row)
                deadline_str = row_dict['deadline']
                priority = Priority(row_dict['priority']) if row_dict['priority'] else Priority.NORMAL
                
                # Calculate days left
                days_left = calculate_days_left(deadline_str) if deadline_str else 0
                
                ddl_list.append(UrgentDDL(
                    id=row_dict['id'],
                    tag=priority_to_tag(priority),
                    urgency=priority_to_urgency(priority),
                    title=row_dict['subject'],
                    deadline=deadline_str,
                    days_left=days_left
                ))
            
            return ddl_list
    
    def update_email_status(
        self,
        email_id: str,
        is_read: Optional[bool] = None,
        is_archived: Optional[bool] = None
    ) -> bool:
        """Update email read/archive status."""
        updates = []
        params = []
        
        if is_read is not None:
            updates.append("is_read = ?")
            params.append(int(is_read))
        
        if is_archived is not None:
            updates.append("is_archived = ?")
            params.append(int(is_archived))
        
        if not updates:
            return True
        
        params.append(email_id)
        
        with self.get_connection() as conn:
            result = conn.execute(
                f"UPDATE emails SET {', '.join(updates)} WHERE id = ?",
                params
            )
            return result.rowcount > 0
    
    def delete_email(self, email_id: str) -> bool:
        """Delete an email from the database."""
        with self.get_connection() as conn:
            result = conn.execute("DELETE FROM emails WHERE id = ?", (email_id,))
            return result.rowcount > 0
    
    def get_today_deadline(self):
        """获取今日截止卡片数据 (朱砂红)"""
        from .models import TodayDeadlineCard
        
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        
        with self.get_connection() as conn:
            # 查找今天截止的邮件，按截止时间排序取最近的一条
            row = conn.execute("""
                SELECT id, subject, deadline FROM emails 
                WHERE deadline LIKE ? 
                AND is_archived = 0
                ORDER BY deadline ASC
                LIMIT 1
            """, (f"{today_str}%",)).fetchone()
            
            if row:
                row_dict = dict(row)
                deadline_str = row_dict.get('deadline', '')
                # 尝试提取时间部分
                try:
                    if 'T' in deadline_str:
                        time_part = deadline_str.split('T')[1][:5]
                        deadline_time = f"今日 {time_part} 截止"
                    else:
                        deadline_time = "今日截止"
                except:
                    deadline_time = "今日截止"
                
                return TodayDeadlineCard(
                    has_data=True,
                    email_id=row_dict['id'],
                    title=row_dict['subject'][:30] + ('...' if len(row_dict['subject']) > 30 else ''),
                    deadline_time=deadline_time
                )
        
        return TodayDeadlineCard()
    
    def get_pending_reply(self):
        """获取待回复卡片数据 (青黛蓝)"""
        from .models import PendingReplyCard
        
        now = datetime.now()
        
        with self.get_connection() as conn:
            # 查找标记为待回复的邮件，按收到时间排序取等待最久的一条
            row = conn.execute("""
                SELECT id, sender_name, sender_email, date_received FROM emails 
                WHERE needs_reply = 1 
                AND is_archived = 0
                ORDER BY date_received ASC
                LIMIT 1
            """).fetchone()
            
            if row:
                row_dict = dict(row)
                sender_name = row_dict.get('sender_name') or row_dict.get('sender_email', '').split('@')[0]
                
                # 计算等待时间
                try:
                    date_received_str = row_dict.get('date_received', '')
                    date_received = datetime.fromisoformat(date_received_str) if date_received_str else now
                    delta = now - date_received
                    
                    if delta.days >= 3:
                        waiting_time = f"已等待 {delta.days} 天"
                    elif delta.days >= 1:
                        waiting_time = f"已等待 {delta.days} 天"
                    else:
                        hours = delta.seconds // 3600
                        if hours >= 1:
                            waiting_time = f"已等待 {hours} 小时"
                        else:
                            minutes = delta.seconds // 60
                            waiting_time = f"已等待 {max(1, minutes)} 分钟"
                except:
                    waiting_time = "等待中"
                
                return PendingReplyCard(
                    has_data=True,
                    email_id=row_dict['id'],
                    sender_name=sender_name[:15] + ('...' if len(sender_name) > 15 else ''),
                    waiting_time=waiting_time
                )
        
        return PendingReplyCard()
    
    def get_pending_attachment(self):
        """获取附件待理卡片数据 (藤黄)"""
        from .models import PendingAttachmentCard
        
        with self.get_connection() as conn:
            # 查找有附件的未归档邮件，按附件数量和时间排序
            row = conn.execute("""
                SELECT id, subject, attachment_count FROM emails 
                WHERE has_attachments = 1 
                AND is_archived = 0
                ORDER BY attachment_count DESC, date_received DESC
                LIMIT 1
            """).fetchone()
            
            if row:
                row_dict = dict(row)
                count = row_dict.get('attachment_count', 1)
                attachment_info = f"📎 {count} 个附件待下载"
                
                return PendingAttachmentCard(
                    has_data=True,
                    email_id=row_dict['id'],
                    title=row_dict['subject'][:20] + ('...' if len(row_dict['subject']) > 20 else ''),
                    attachment_info=attachment_info
                )
        
        return PendingAttachmentCard()
    
    def _get_time_range_start(self, time_range: TimeRange) -> Optional[datetime]:
        """Get the start date for a time range."""
        now = datetime.now()
        
        if time_range == TimeRange.TODAY:
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == TimeRange.WEEK:
            return now - timedelta(days=7)
        elif time_range == TimeRange.MONTH:
            return now - timedelta(days=30)
        else:  # ALL
            return None
    
    def _row_to_email(self, row: Dict[str, Any]) -> Email:
        """Convert a database row to an Email object."""
        date_received = None
        if row.get('date_received'):
            try:
                date_received = datetime.fromisoformat(row['date_received'])
            except (ValueError, TypeError):
                date_received = datetime.now()
        
        # Parse priority
        priority_value = row.get('priority', 'normal')
        try:
            priority = Priority(priority_value)
        except ValueError:
            priority = Priority.NORMAL
        
        # Parse tags
        tags = []
        if row.get('tags'):
            try:
                tags = json.loads(row['tags'])
            except (json.JSONDecodeError, TypeError):
                tags = []
        
        # Parse AI mode
        ai_mode = None
        if row.get('ai_mode'):
            try:
                ai_mode = AIMode(row['ai_mode'])
            except ValueError:
                ai_mode = None
        
        # Parse privacy level
        privacy_value = row.get('privacy_level', 'normal')
        try:
            privacy_level = PrivacyLevel(privacy_value)
        except ValueError:
            privacy_level = PrivacyLevel.NORMAL
        
        return Email(
            id=row['id'],
            tag=priority_to_tag(priority),
            urgency=priority_to_urgency(priority),
            subject=row['subject'],
            sender_name=row.get('sender_name', ''),
            sender_email=row['sender_email'],
            time=format_relative_time(date_received) if date_received else "",
            has_deadline=bool(row.get('deadline')),
            deadline=row.get('deadline'),
            has_attachments=bool(row.get('has_attachments')),
            attachment_count=row.get('attachment_count', 0),
            summary=row.get('summary', ''),
            ai_model=row.get('ai_model', ''),
            tags=tags,
            body=row.get('body_text', ''),
            is_read=bool(row.get('is_read')),
            is_archived=bool(row.get('is_archived')),
            date_received=date_received,
            body_html=row.get('body_html'),
            priority=priority,
            ai_processed=bool(row.get('ai_processed')),
            ai_mode=ai_mode,
            privacy_level=privacy_level
        )
    
    def is_first_sync(self) -> bool:
        """Check if this is the first sync (no successful sync history)."""
        with self.get_connection() as conn:
            result = conn.execute(
                "SELECT COUNT(*) FROM sync_history WHERE status = 'completed'"
            ).fetchone()
            return result[0] == 0 if result else True
    
    def create_sync_session(self, sync_type: str, days_range: int) -> int:
        """Create a new sync session and return its ID."""
        from datetime import datetime
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO sync_history (sync_started_at, sync_type, days_range, status)
                VALUES (?, ?, ?, 'in_progress')
            """, (datetime.now().isoformat(), sync_type, days_range))
            return cursor.lastrowid
    
    def complete_sync_session(self, session_id: int, emails_synced: int, emails_processed: int):
        """Mark a sync session as completed."""
        from datetime import datetime
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE sync_history
                SET sync_completed_at = ?, emails_synced = ?, emails_processed = ?, status = 'completed'
                WHERE id = ?
            """, (datetime.now().isoformat(), emails_synced, emails_processed, session_id))
    
    def fail_sync_session(self, session_id: int, error_message: str):
        """Mark a sync session as failed."""
        from datetime import datetime
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE sync_history
                SET sync_completed_at = ?, status = 'failed', error_message = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), error_message, session_id))
    
    def get_last_successful_sync(self) -> Optional[datetime]:
        """Get the timestamp of the last successful sync."""
        with self.get_connection() as conn:
            result = conn.execute("""
                SELECT sync_completed_at FROM sync_history
                WHERE status = 'completed'
                ORDER BY sync_completed_at DESC
                LIMIT 1
            """).fetchone()
            if result and result[0]:
                try:
                    return datetime.fromisoformat(result[0])
                except (ValueError, TypeError):
                    pass
        return None


# Global database instance
_db: Optional[Database] = None


def get_database() -> Database:
    """Get the global database instance."""
    global _db
    if _db is None:
        _db = Database()
    return _db
