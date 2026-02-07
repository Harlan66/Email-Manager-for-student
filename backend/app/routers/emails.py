"""
Email API router for Email-Manager.
Handles email CRUD operations and sync.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from ..models import (
    Email, EmailUpdate, TimeRange, Priority,
    SyncResult, priority_to_tag, priority_to_urgency
)
from ..database import get_database
from ..config import get_config
from ..services.imap_service import IMAPService
from ..services.ai_service import get_ai_service

router = APIRouter()


@router.get("/emails", response_model=List[Email])
async def get_emails(
    time_range: str = Query("全部", description="Time range: 今日/本周/本月/全部"),
    priority: Optional[str] = Query(None, description="Priority filter"),
    is_archived: Optional[bool] = Query(None, description="Archive filter"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Get list of emails with filtering."""
    db = get_database()
    
    # Parse time range
    try:
        time_range_enum = TimeRange(time_range)
    except ValueError:
        time_range_enum = TimeRange.ALL
    
    # Parse priority
    priority_enum = None
    if priority:
        try:
            priority_enum = Priority(priority)
        except ValueError:
            pass
    
    emails = db.get_emails(
        time_range=time_range_enum,
        priority=priority_enum,
        is_archived=is_archived,
        limit=limit,
        offset=offset
    )
    
    return emails


@router.get("/emails/{email_id}", response_model=Email)
async def get_email(email_id: str):
    """Get a single email by ID."""
    db = get_database()
    email = db.get_email(email_id)
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return email


@router.post("/emails/sync", response_model=SyncResult)
async def sync_emails(days: int = Query(7, ge=1, le=30)):
    """
    Sync emails from IMAP server.
    Fetches recent emails, processes with AI, and saves to database.
    """
    config = get_config()
    db = get_database()
    ai_service = get_ai_service()
    
    # Get email configuration
    email_config = config.get_email_config()
    
    if not email_config.get("imap_server") or not email_config.get("email"):
        return SyncResult(
            success=False,
            message="请先配置邮箱设置",
            emails_synced=0,
            emails_processed=0
        )
    
    # Connect to IMAP
    imap = IMAPService(
        server=email_config.get("imap_server"),
        email=email_config.get("email"),
        password=email_config.get("password")
    )
    
    if not imap.connect():
        return SyncResult(
            success=False,
            message="IMAP连接失败，请检查邮箱配置",
            emails_synced=0,
            emails_processed=0
        )
    
    try:
        # Fetch emails
        raw_emails = imap.fetch_recent(days=days, limit=50)
        
        synced_count = 0
        processed_count = 0
        
        for raw_email in raw_emails:
            # Skip if already exists
            if db.email_exists(raw_email.get("id", "")):
                continue
            
            # Process with AI
            processed_email = ai_service.process_email(raw_email)
            
            # Save to database
            db.save_email(processed_email)
            
            synced_count += 1
            if processed_email.ai_processed:
                processed_count += 1
        
        return SyncResult(
            success=True,
            message=f"同步完成，新增{synced_count}封邮件",
            emails_synced=synced_count,
            emails_processed=processed_count
        )
    except Exception as e:
        return SyncResult(
            success=False,
            message=f"同步失败: {str(e)}",
            emails_synced=0,
            emails_processed=0
        )
    finally:
        imap.disconnect()


@router.put("/emails/{email_id}/read")
async def mark_email_read(email_id: str):
    """Mark an email as read."""
    db = get_database()
    
    if not db.email_exists(email_id):
        raise HTTPException(status_code=404, detail="Email not found")
    
    db.update_email_status(email_id, is_read=True)
    
    return {"success": True, "message": "邮件已标记为已读"}


@router.put("/emails/{email_id}/archive")
async def archive_email(email_id: str):
    """Archive an email."""
    db = get_database()
    
    if not db.email_exists(email_id):
        raise HTTPException(status_code=404, detail="Email not found")
    
    db.update_email_status(email_id, is_archived=True)
    
    return {"success": True, "message": "邮件已归档"}


@router.put("/emails/{email_id}/unarchive")
async def unarchive_email(email_id: str):
    """Unarchive an email."""
    db = get_database()
    
    if not db.email_exists(email_id):
        raise HTTPException(status_code=404, detail="Email not found")
    
    db.update_email_status(email_id, is_archived=False)
    
    return {"success": True, "message": "邮件已取消归档"}


@router.delete("/emails/{email_id}")
async def delete_email(email_id: str):
    """Delete an email."""
    db = get_database()
    
    if not db.delete_email(email_id):
        raise HTTPException(status_code=404, detail="Email not found")
    
    return {"success": True, "message": "邮件已删除"}
