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
