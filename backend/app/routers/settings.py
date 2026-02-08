"""
Settings API router for Email-Manager.
Handles configuration and connection testing.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

from ..models import SettingsConfig, TestConnectionResult
from ..config import get_config, reload_config
from ..services.imap_service import IMAPService
from ..services.ai_service import get_ai_service, reload_ai_service

router = APIRouter()


class SettingsUpdateRequest(BaseModel):
    """Request model for settings update."""
    email: Dict[str, str] = None
    ai_mode: str = None
    local: Dict[str, str] = None
    api: Dict[str, str] = None
    hybrid: Dict[str, Any] = None
    theme: str = None
    language: str = None


@router.get("/settings", response_model=Dict[str, Any])
async def get_settings():
    """Get current settings."""
    config = get_config()
    settings = config.to_dict()
    
    # Mask sensitive data
    if settings.get("email", {}).get("password"):
        settings["email"]["password"] = "***"
    if settings.get("ai", {}).get("api", {}).get("key"):
        settings["ai"]["api"]["key"] = "***" if settings["ai"]["api"]["key"] else ""
    if settings.get("ai", {}).get("hybrid", {}).get("api_key"):
        settings["ai"]["hybrid"]["api_key"] = "***" if settings["ai"]["hybrid"]["api_key"] else ""
    
    return settings


@router.put("/settings")
async def update_settings(request: SettingsUpdateRequest):
    """Update settings."""
    config = get_config()
    
    # Update email settings
    if request.email:
        for key, value in request.email.items():
            if value is not None and value != "***":  # Don't update masked passwords
                config.set(f"email.{key}", value)
    
    # Update AI mode
    if request.ai_mode:
        config.set("ai.mode", request.ai_mode)
    
    # Update local AI settings
    if request.local:
        for key, value in request.local.items():
            if value is not None:
                config.set(f"ai.local.{key}", value)
    
    # Update API settings
    if request.api:
        for key, value in request.api.items():
            if value is not None and value != "***":
                config.set(f"ai.api.{key}", value)
    
    # Update hybrid settings
    if request.hybrid:
        for key, value in request.hybrid.items():
            if value is not None and value != "***":
                config.set(f"ai.hybrid.{key}", value)
    
    # Update UI settings
    if request.theme:
        config.set("ui.theme", request.theme)
    
    if request.language:
        config.set("ui.language", request.language)
    
    # Reload AI service with new config
    reload_ai_service()
    
    return {"success": True, "message": "设置已保存"}


class TestImapRequest(BaseModel):
    imap_server: str = None
    email: str = None
    password: str = None

@router.post("/settings/test-imap", response_model=TestConnectionResult)
async def test_imap_connection(request: TestImapRequest = None):
    """
    Test IMAP connection.
    If request is provided, test with those credentials.
    Otherwise, test with saved settings.
    """
    config = get_config()
    email_config = config.get_email_config()
    
    # Override with request data if provided
    server = (request.imap_server if request and request.imap_server else email_config.get("imap_server"))
    email_addr = (request.email if request and request.email else email_config.get("email"))
    password = (request.password if request and request.password else email_config.get("password"))
    
    if not server or not email_addr:
        return TestConnectionResult(
            success=False,
            message="请先填写IMAP服务器和邮箱地址"
        )
    
    # Handle masked password if the test comes from the UI without changing it
    if password == "***":
        password = email_config.get("password")
    
    imap = IMAPService(
        server=server,
        email=email_addr,
        password=password
    )
    
    result = imap.test_connection()
    
    return TestConnectionResult(
        success=result.get("success", False),
        message=result.get("message", "未知错误"),
        details={
            "folders": result.get("folders", []),
            "inbox_count": result.get("inbox_count", 0)
        }
    )


@router.post("/settings/test-ai-local", response_model=TestConnectionResult)
async def test_ai_local_connection():
    """Test local AI (Ollama) connection."""
    ai_service = get_ai_service()
    result = ai_service.test_local_connection()
    
    return TestConnectionResult(
        success=result.get("success", False),
        message=result.get("message", "未知错误"),
        details={
            "available_models": result.get("available_models", []),
            "target_model_available": result.get("target_model_available", False)
        }
    )


@router.post("/settings/test-ai-api", response_model=TestConnectionResult)
async def test_ai_api_connection():
    """Test cloud AI API connection."""
    ai_service = get_ai_service()
    result = ai_service.test_api_connection()
    
    return TestConnectionResult(
        success=result.get("success", False),
        message=result.get("message", "未知错误"),
        details={
            "models": result.get("models", [])
        }
    )
