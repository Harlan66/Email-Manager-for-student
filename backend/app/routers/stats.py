"""
Statistics and DDL API router for Email-Manager.
"""
from fastapi import APIRouter, Query
from typing import List
from datetime import datetime

from ..models import (
    OverviewData, UrgentDDL, TimeRange,
    ActionCardsData, TodayDeadlineCard, PendingReplyCard, PendingAttachmentCard
)
from ..database import get_database

router = APIRouter()


@router.get("/stats", response_model=OverviewData)
async def get_stats(
    time_range: str = Query("本周", description="Time range: 今日/本周/本月/全部")
):
    """Get overview statistics for dashboard."""
    db = get_database()
    
    # Parse time range
    try:
        time_range_enum = TimeRange(time_range)
    except ValueError:
        time_range_enum = TimeRange.WEEK
    
    return db.get_stats(time_range_enum)


@router.get("/ddl", response_model=List[UrgentDDL])
async def get_urgent_ddl(
    days: int = Query(7, ge=1, le=30, description="Days to look ahead")
):
    """Get urgent DDL items for top notification area."""
    db = get_database()
    return db.get_urgent_ddl(days=days)


@router.get("/stats/action-cards", response_model=ActionCardsData)
async def get_action_cards():
    """
    Get action cards data for overview section (东方美学设计).
    Returns today's deadline, pending reply, and pending attachment info.
    """
    db = get_database()
    now = datetime.now()
    current_date = now.strftime("%Y年%m月%d日")
    
    # Card 1: 今日截止 (朱砂红)
    today_deadline = db.get_today_deadline()
    
    # Card 2: 待回复 (青黛蓝)
    pending_reply = db.get_pending_reply()
    
    # Card 3: 附件待理 (藤黄)
    pending_attachment = db.get_pending_attachment()
    
    return ActionCardsData(
        today_deadline=today_deadline,
        pending_reply=pending_reply,
        pending_attachment=pending_attachment,
        current_date=current_date
    )


@router.get("/report/export")
async def export_test_report():
    """
    Export test report as JSON.
    Contains: email classification results, processing stats, and summary.
    """
    db = get_database()
    
    # Get all emails
    all_emails = db.get_emails(limit=1000)
    
    # Classification statistics
    priority_stats = {"urgent": 0, "important": 0, "normal": 0, "archive": 0}
    ai_processed_count = 0
    has_ddl_count = 0
    needs_reply_count = 0
    
    emails_data = []
    for email in all_emails:
        # Count by priority
        priority_stats[email.priority.value] = priority_stats.get(email.priority.value, 0) + 1
        
        # Count AI processed
        if email.ai_processed:
            ai_processed_count += 1
        
        # Count with DDL (deadline is stored as string)
        if email.deadline:
            has_ddl_count += 1
        
        # Count needs reply
        if email.needs_reply:
            needs_reply_count += 1
        
        # Add to export data
        emails_data.append({
            "id": email.id,
            "subject": email.subject,
            "sender": email.sender_name or email.sender_email,
            "date": email.date_received.isoformat() if email.date_received else None,
            "priority": email.priority.value,
            "summary": email.summary,
            "deadline": email.deadline,
            "needs_reply": email.needs_reply,
            "ai_processed": email.ai_processed,
            "tags": email.tags,
        })
    
    report = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "total_emails": len(all_emails),
            "date_range": {
                "from": min((e.date_received for e in all_emails if e.date_received), default=None),
                "to": max((e.date_received for e in all_emails if e.date_received), default=None),
            }
        },
        "classification_results": {
            "by_priority": priority_stats,
        },
        "processing_stats": {
            "ai_processed_count": ai_processed_count,
            "ai_processed_rate": round(ai_processed_count / len(all_emails) * 100, 1) if all_emails else 0,
            "has_ddl_count": has_ddl_count,
            "needs_reply_count": needs_reply_count,
        },
        "accuracy": {
            "note": "准确率需人工标注后计算，以下为自动统计数据",
            "ddl_extraction_rate": round(has_ddl_count / len(all_emails) * 100, 1) if all_emails else 0,
        },
        "emails": emails_data,
    }
    
    # Serialize dates in meta
    if report["meta"]["date_range"]["from"]:
        report["meta"]["date_range"]["from"] = report["meta"]["date_range"]["from"].isoformat()
    if report["meta"]["date_range"]["to"]:
        report["meta"]["date_range"]["to"] = report["meta"]["date_range"]["to"].isoformat()
    
    return report
