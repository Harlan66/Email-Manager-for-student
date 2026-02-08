"""
Email API router for Email-Manager.
Handles email CRUD operations and sync.
"""
import logging
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
logger = logging.getLogger(__name__)


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


@router.get("/emails/sync-stream")
async def sync_emails_stream(
    request_days: int = Query(90, ge=1, le=365, alias="days"),
    force_first: bool = Query(False, description="Force first sync strategy (7+ days)")
):
    """
    Sync emails with streaming progress updates (SSE).
    Returns server-sent events with progress info.
    Use force_first=true to force a full sync instead of incremental.
    """
    from sse_starlette.sse import EventSourceResponse
    import json
    import asyncio
    
    async def event_generator():
        config = get_config()
        db = get_database()
        ai_service = get_ai_service()
        
        # Get email configuration
        email_config = config.get_email_config()
        
        if not email_config.get("imap_server") or not email_config.get("email"):
            yield {"event": "error", "data": json.dumps({"message": "请先配置邮箱设置"})}
            return
        
        # Determine sync strategy based on history (or force_first parameter)
        is_first = db.is_first_sync() or force_first
        sync_config = config.get("sync", {})
        
        if is_first:
            strategy = sync_config.get("first_sync", {"days": 7, "batch_size": 10, "delay_between_batches_ms": 500})
            sync_type = "first_sync"
            msg = "全量同步" if force_first else "首次同步"
            yield {"event": "status", "data": json.dumps({
                "status": "connecting", 
                "message": f"{msg}：将获取最近{strategy.get('days', 7)}天邮件..."
            })}
        else:
            strategy = sync_config.get("incremental_sync", {"days": 3, "batch_size": 20, "delay_between_batches_ms": 200})
            sync_type = "incremental_sync"
            yield {"event": "status", "data": json.dumps({
                "status": "connecting", 
                "message": f"增量同步：检查最近{strategy.get('days', 3)}天新邮件..."
            })}
        
        # Use request days if it's greater than strategy days, otherwise use strategy days
        days = max(request_days, strategy.get("days", 7))
        batch_size = strategy.get("batch_size", 10)
        delay_ms = strategy.get("delay_between_batches_ms", 500)
        max_emails = sync_config.get("max_emails_per_sync", 1000)
        
        await asyncio.sleep(0)
        
        # Create sync session
        session_id = db.create_sync_session(sync_type, days)
        
        # Connect to IMAP
        imap = IMAPService(
            server=email_config.get("imap_server"),
            email=email_config.get("email"),
            password=email_config.get("password")
        )
        
        if not imap.connect():
            db.fail_sync_session(session_id, "IMAP连接失败")
            yield {"event": "error", "data": json.dumps({"message": "IMAP连接失败"})}
            return
        
        try:
            yield {"event": "status", "data": json.dumps({"status": "fetching", "message": "正在获取邮件列表..."})}
            await asyncio.sleep(0)
            
            # Use UIDs first to check what's new
            all_uids = imap.fetch_uids(days=days)
            logger.info(f"[SYNC DEBUG] fetch_uids returned {len(all_uids)} UIDs for {days} days")
            
            # Filter out already existing emails to avoid fetching them again
            new_uids = []
            existing_count = 0
            for uid in all_uids:
                if db.email_exists(uid):
                    existing_count += 1
                else:
                    new_uids.append(uid)
            
            logger.info(f"[SYNC DEBUG] {existing_count} emails already exist, {len(new_uids)} are new")
            
            # UIDs are typically in ascending order (oldest first)
            # Reverse to get newest first, so when we truncate, we keep recent emails
            new_uids = list(reversed(new_uids))
            
            # Apply max limit (now keeping newest emails)
            if len(new_uids) > max_emails:
                logger.warning(f"Found {len(new_uids)} new emails, limiting to {max_emails}")
                new_uids = new_uids[:max_emails]
            
            total = len(new_uids)
            logger.info(f"SSE: {len(all_uids)} total emails, {total} new emails to process (sync_type={sync_type})")
            
            if total == 0:
                db.complete_sync_session(session_id, 0, 0)
                yield {"event": "complete", "data": json.dumps({
                    "success": True,
                    "message": "所有邮件已是最新",
                    "emails_synced": 0,
                    "emails_processed": 0
                })}
                return

            yield {"event": "progress", "data": json.dumps({
                "total": total,
                "current": 0,
                "synced": 0,
                "processed": 0,
                "message": f"发现 {total} 封新邮件待处理"
            })}
            await asyncio.sleep(0)
            
            synced_count = 0
            processed_count = 0
            
            # Fetch and process in batches to avoid OVERQUOTA
            for i in range(0, total, batch_size):
                batch_uids = new_uids[i:i + batch_size]
                try:
                    batch_emails = imap.fetch_by_uids(batch_uids)
                except Exception as e:
                    logger.error(f"Failed to fetch batch {i//batch_size}: {e}")
                    # Continue with next batch instead of failing completely
                    continue
                
                for j, raw_email in enumerate(batch_emails):
                    # Process with AI
                    try:
                        processed_email = ai_service.process_email(raw_email)
                        # Save to database
                        db.save_email(processed_email)
                        
                        synced_count += 1
                        if processed_email.ai_processed:
                            processed_count += 1
                    except Exception as e:
                        logger.error(f"Failed to process email {raw_email.get('subject')}: {e}")
                    
                    yield {"event": "progress", "data": json.dumps({
                        "total": total,
                        "current": i + j + 1,
                        "synced": synced_count,
                        "processed": processed_count,
                        "message": f"已处理: {raw_email.get('subject', '')[:30]}"
                    })}
                    await asyncio.sleep(0)
                
                # Add delay between batches to avoid overwhelming the server
                if i + batch_size < total and delay_ms > 0:
                    await asyncio.sleep(delay_ms / 1000.0)
            
            db.complete_sync_session(session_id, synced_count, processed_count)
            yield {"event": "complete", "data": json.dumps({
                "success": True,
                "message": f"同步完成，新增 {synced_count} 封邮件",
                "emails_synced": synced_count,
                "emails_processed": processed_count
            })}
            
        except Exception as e:
            error_msg = str(e)
            db.fail_sync_session(session_id, error_msg)
            logger.error(f"Sync failed: {error_msg}", exc_info=True)
            yield {"event": "error", "data": json.dumps({"message": f"同步失败: {error_msg}"})}
        finally:
            imap.disconnect()
    
    return EventSourceResponse(event_generator())


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
    Note: This endpoint is deprecated in favor of sync-stream.
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
    
    # Determine sync strategy
    is_first = db.is_first_sync()
    sync_config = config.get("sync", {})
    
    if is_first:
        strategy = sync_config.get("first_sync", {"days": 7, "batch_size": 10})
        sync_type = "first_sync"
        days = strategy.get("days", 7)
    else:
        strategy = sync_config.get("incremental_sync", {"days": 3, "batch_size": 20})
        sync_type = "incremental_sync"
        days = strategy.get("days", 3)
    
    batch_size = strategy.get("batch_size", 20)
    max_emails = sync_config.get("max_emails_per_sync", 200)
    
    # Create sync session
    session_id = db.create_sync_session(sync_type, days)
    
    # Connect to IMAP
    imap = IMAPService(
        server=email_config.get("imap_server"),
        email=email_config.get("email"),
        password=email_config.get("password")
    )
    
    if not imap.connect():
        db.fail_sync_session(session_id, "IMAP连接失败")
        return SyncResult(
            success=False,
            message="IMAP连接失败，请检查邮箱配置",
            emails_synced=0,
            emails_processed=0
        )
    
    try:
        # Use UIDs first to check what's new
        logger.info(f"Starting {sync_type} for {days} days")
        all_uids = imap.fetch_uids(days=days)
        
        # Filter out already existing emails
        new_uids = [uid for uid in all_uids if not db.email_exists(uid)]
        
        # Apply max limit
        if len(new_uids) > max_emails:
            logger.warning(f"Found {len(new_uids)} new emails, limiting to {max_emails}")
            new_uids = new_uids[:max_emails]
        
        logger.info(f"Found {len(all_uids)} total emails, {len(new_uids)} are new")
        
        synced_count = 0
        processed_count = 0
        
        # Fetch and process in batches
        for i in range(0, len(new_uids), batch_size):
            batch_uids = new_uids[i:i + batch_size]
            try:
                batch_emails = imap.fetch_by_uids(batch_uids)
            except Exception as e:
                logger.error(f"Failed to fetch batch {i//batch_size}: {e}")
                continue
            
            for raw_email in batch_emails:
                try:
                    # Process with AI
                    processed_email = ai_service.process_email(raw_email)
                    
                    # Save to database
                    db.save_email(processed_email)
                    
                    synced_count += 1
                    if processed_email.ai_processed:
                        processed_count += 1
                except Exception as e:
                    logger.error(f"Failed to process email: {e}")
        
        db.complete_sync_session(session_id, synced_count, processed_count)
        logger.info(f"Sync complete: {synced_count} new emails, {processed_count} AI processed")
        return SyncResult(
            success=True,
            message=f"同步完成，新增{synced_count}封邮件",
            emails_synced=synced_count,
            emails_processed=processed_count
        )
    except Exception as e:
        error_msg = str(e)
        db.fail_sync_session(session_id, error_msg)
        logger.error(f"Sync failed with exception: {error_msg}", exc_info=True)
        return SyncResult(
            success=False,
            message=f"同步失败: {error_msg}",
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
