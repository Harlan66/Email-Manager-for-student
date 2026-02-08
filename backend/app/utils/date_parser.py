"""
Date parsing utilities for Email-Manager.
Handles date format conversion and relative time display.
"""
from datetime import datetime, timedelta
from typing import Optional
import re


def parse_deadline(text: str) -> Optional[datetime]:
    """
    Extract deadline date from text.
    
    Supports formats:
    - 2026-02-15, 2026/02/15
    - February 15, 2026
    - 15/02/2026
    - 2月15日
    - due on 15 Feb
    """
    if not text:
        return None
    
    # Try ISO format first
    iso_pattern = r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})'
    match = re.search(iso_pattern, text)
    if match:
        try:
            year, month, day = match.groups()
            return datetime(int(year), int(month), int(day))
        except ValueError:
            pass
    
    # Try Chinese date format: X月X日
    chinese_pattern = r'(\d{1,2})月(\d{1,2})日'
    match = re.search(chinese_pattern, text)
    if match:
        try:
            month, day = match.groups()
            year = datetime.now().year
            return datetime(year, int(month), int(day))
        except ValueError:
            pass
    
    # Try DD/MM/YYYY format
    dmy_pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
    match = re.search(dmy_pattern, text)
    if match:
        try:
            day, month, year = match.groups()
            return datetime(int(year), int(month), int(day))
        except ValueError:
            pass
    
    # Try English month format: February 15, 2026 or 15 Feb 2026
    months = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7,
        'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    
    # Pattern: Month DD, YYYY
    mdy_pattern = r'(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})'
    match = re.search(mdy_pattern, text.lower())
    if match:
        try:
            month_str, day, year = match.groups()
            month = months.get(month_str)
            if month:
                return datetime(int(year), month, int(day))
        except ValueError:
            pass
    
    # Pattern: DD Month YYYY
    dmy_eng_pattern = r'(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})?'
    match = re.search(dmy_eng_pattern, text.lower())
    if match:
        try:
            day, month_str, year = match.groups()
            month = months.get(month_str)
            if month:
                year = int(year) if year else datetime.now().year
                return datetime(year, month, int(day))
        except ValueError:
            pass
    
    return None


def format_relative_time(dt: Optional[datetime]) -> str:
    """
    Format datetime as relative time string.
    
    Examples:
    - "刚刚" (just now)
    - "2h前" (2 hours ago)
    - "1天前" (1 day ago)
    - "2026-02-01" (for older dates)
    """
    if not dt:
        return ""
    
    # Handle timezone-aware datetimes by converting to naive (local time)
    if dt.tzinfo is not None:
        # Convert to local time and remove timezone info
        dt = dt.replace(tzinfo=None)
    
    now = datetime.now()
    
    # Handle future dates
    if dt > now:
        return dt.strftime("%Y-%m-%d")
    
    diff = now - dt
    
    if diff.days == 0:
        hours = diff.seconds // 3600
        if hours == 0:
            minutes = diff.seconds // 60
            if minutes < 5:
                return "刚刚"
            return f"{minutes}分钟前"
        return f"{hours}h前"
    elif diff.days == 1:
        return "昨天"
    elif diff.days < 7:
        return f"{diff.days}天前"
    elif diff.days < 30:
        weeks = diff.days // 7
        return f"{weeks}周前"
    else:
        return dt.strftime("%Y-%m-%d")


def format_countdown(deadline: Optional[str]) -> str:
    """
    Format deadline as countdown string.
    
    Examples:
    - "今天截止!" (due today)
    - "剩2天!" (2 days left, urgent)
    - "剩5天" (5 days left)
    - "已过期" (expired)
    """
    if not deadline:
        return ""
    
    try:
        # Parse deadline string
        if isinstance(deadline, str):
            deadline_dt = datetime.strptime(deadline[:10], "%Y-%m-%d")
        else:
            deadline_dt = deadline
        
        now = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        diff = deadline_dt - now
        
        if diff.days < 0:
            return "已过期"
        elif diff.days == 0:
            return "今天截止!"
        elif diff.days <= 3:
            return f"剩{diff.days}天!"
        else:
            return f"剩{diff.days}天"
    except (ValueError, TypeError):
        return ""


def calculate_days_left(deadline: Optional[str]) -> int:
    """
    Calculate days left until deadline.
    
    Returns:
    - Positive number: days remaining
    - 0: due today
    - Negative number: days overdue
    """
    if not deadline:
        return 0
    
    try:
        if isinstance(deadline, str):
            deadline_dt = datetime.strptime(deadline[:10], "%Y-%m-%d")
        else:
            deadline_dt = deadline
        
        now = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        diff = deadline_dt - now
        return diff.days
    except (ValueError, TypeError):
        return 0


def format_datetime_display(dt: Optional[datetime]) -> str:
    """
    Format datetime for display in detail view.
    
    Example: "2026年2月15日 23:59"
    """
    if not dt:
        return ""
    
    return dt.strftime("%Y年%m月%d日 %H:%M")


def get_date_range(time_range: str) -> tuple[Optional[datetime], datetime]:
    """
    Get start and end datetime for a time range.
    
    Args:
        time_range: "今日", "本周", "本月", "全部"
    
    Returns:
        (start_date, end_date)
    """
    now = datetime.now()
    end_date = now
    
    if time_range == "今日":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_range == "本周":
        start_date = now - timedelta(days=7)
    elif time_range == "本月":
        start_date = now - timedelta(days=30)
    else:  # 全部
        start_date = None
    
    return start_date, end_date
