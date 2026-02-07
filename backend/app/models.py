"""
Data models for Email-Manager.
Pydantic models that align with frontend TypeScript types.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal
from enum import Enum


# === Enums ===

class EmailTag(str, Enum):
    """Email tag/priority indicator."""
    URGENT = "🔴"
    WARNING = "🟡"
    NORMAL = "🟢"
    ARCHIVED = "⚪"


class UrgencyLevel(str, Enum):
    """Urgency level for emails."""
    URGENT = "urgent"
    WARNING = "warning"
    NORMAL = "normal"
    ARCHIVED = "archived"


class Priority(str, Enum):
    """Email priority classification."""
    URGENT = "urgent"
    IMPORTANT = "important"
    NORMAL = "normal"
    ARCHIVE = "archive"


class AIMode(str, Enum):
    """AI processing mode."""
    LOCAL = "local"
    API = "api"
    HYBRID = "hybrid"


class APIProvider(str, Enum):
    """API service provider."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"
    GLM = "glm"
    QWEN = "qwen"
    MINIMAX = "minimax"
    MOONSHOT = "moonshot"


class TimeRange(str, Enum):
    """Time range for statistics."""
    TODAY = "今日"
    WEEK = "本周"
    MONTH = "本月"
    ALL = "全部"


class PrivacyLevel(str, Enum):
    """Privacy sensitivity level."""
    NORMAL = "normal"
    HIGH = "high"
    EXTREME = "extreme"


# === Email Models ===

class Email(BaseModel):
    """Email data model - aligned with frontend Email type."""
    id: str
    tag: EmailTag = EmailTag.NORMAL
    urgency: UrgencyLevel = UrgencyLevel.NORMAL
    subject: str
    sender_name: str
    sender_email: str
    time: str  # Relative time string like "2h前"
    has_deadline: bool = False
    deadline: Optional[str] = None  # ISO date string
    has_attachments: bool = False
    attachment_count: int = 0
    summary: str = ""
    ai_model: str = ""
    tags: List[str] = Field(default_factory=list)
    body: str = ""
    is_read: bool = False
    is_archived: bool = False
    
    # Additional backend fields
    date_received: Optional[datetime] = None
    body_html: Optional[str] = None
    priority: Priority = Priority.NORMAL
    ai_processed: bool = False
    ai_mode: Optional[AIMode] = None
    privacy_level: PrivacyLevel = PrivacyLevel.NORMAL


class EmailCreate(BaseModel):
    """Model for creating email from IMAP."""
    subject: str
    sender_name: str
    sender_email: str
    date_received: datetime
    body: str
    body_html: Optional[str] = None
    has_attachments: bool = False
    attachment_count: int = 0


class EmailUpdate(BaseModel):
    """Model for updating email status."""
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None


# === DDL Models ===

class UrgentDDL(BaseModel):
    """Urgent deadline item - aligned with frontend UrgentDDL type."""
    id: str
    tag: EmailTag
    urgency: UrgencyLevel
    title: str
    deadline: str  # ISO date string
    days_left: int


# === Statistics Models ===

class OverviewData(BaseModel):
    """Overview statistics - aligned with frontend OverviewData type."""
    total: int
    urgent_ddl: int
    near_deadline: int
    time_range: TimeRange


# === Settings Models ===

class EmailConfig(BaseModel):
    """Email IMAP configuration."""
    imap_server: str = ""
    email: str = ""
    password: str = ""


class LocalAIConfig(BaseModel):
    """Local AI (Ollama) configuration."""
    model: str = "llama3.1:8b"
    host: str = "http://localhost:11434"


class APIAIConfig(BaseModel):
    """API AI configuration."""
    provider: APIProvider = APIProvider.OPENAI
    model: str = "gpt-4o-mini"
    key: str = ""


class HybridAIConfig(BaseModel):
    """Hybrid AI configuration."""
    local_model: str = "llama3.1:8b"
    api_provider: APIProvider = APIProvider.OPENAI
    api_model: str = "gpt-4o-mini"
    api_key: str = ""
    confirm_before_api: bool = True


class SettingsConfig(BaseModel):
    """Complete settings configuration - aligned with frontend SettingsConfig type."""
    email: EmailConfig = Field(default_factory=EmailConfig)
    ai_mode: AIMode = AIMode.HYBRID
    local: LocalAIConfig = Field(default_factory=LocalAIConfig)
    api: APIAIConfig = Field(default_factory=APIAIConfig)
    hybrid: HybridAIConfig = Field(default_factory=HybridAIConfig)
    theme: Literal["light", "dark"] = "light"
    language: Literal["zh", "en"] = "zh"


# === Response Models ===

class SyncResult(BaseModel):
    """Result of email sync operation."""
    success: bool
    message: str
    emails_synced: int = 0
    emails_processed: int = 0


class TestConnectionResult(BaseModel):
    """Result of connection test."""
    success: bool
    message: str
    details: Optional[dict] = None


class PrivacyScanResult(BaseModel):
    """Result of privacy scan."""
    level: PrivacyLevel
    matched_keywords: List[str] = Field(default_factory=list)
    reason: str
    recommendation: str


# === Action Cards Models (东方美学) ===

class TodayDeadlineCard(BaseModel):
    """今日截止卡片数据 - 朱砂红"""
    has_data: bool = False
    email_id: Optional[str] = None
    title: str = ""
    deadline_time: str = ""  # 如 "14:00 截止"
    empty_text: str = "今日无事"
    empty_subtext: str = "斋中静坐"


class PendingReplyCard(BaseModel):
    """待回复卡片数据 - 青黛蓝"""
    has_data: bool = False
    email_id: Optional[str] = None
    sender_name: str = ""
    waiting_time: str = ""  # 如 "已等待 3 小时"
    empty_text: str = "无欠于外"
    empty_subtext: str = "尺牍已复"


class PendingAttachmentCard(BaseModel):
    """附件待理卡片数据 - 藤黄"""
    has_data: bool = False
    email_id: Optional[str] = None
    title: str = ""
    attachment_info: str = ""  # 如 "2 个附件待下载"
    empty_text: str = "物已归位"
    empty_subtext: str = "无附件待理"


class ActionCardsData(BaseModel):
    """行动卡片聚合数据"""
    today_deadline: TodayDeadlineCard = Field(default_factory=TodayDeadlineCard)
    pending_reply: PendingReplyCard = Field(default_factory=PendingReplyCard)
    pending_attachment: PendingAttachmentCard = Field(default_factory=PendingAttachmentCard)
    current_date: str = ""  # 如 "2026年2月6日"


# === Utility Functions ===

def priority_to_tag(priority: Priority) -> EmailTag:
    """Convert Priority to EmailTag."""
    mapping = {
        Priority.URGENT: EmailTag.URGENT,
        Priority.IMPORTANT: EmailTag.WARNING,
        Priority.NORMAL: EmailTag.NORMAL,
        Priority.ARCHIVE: EmailTag.ARCHIVED
    }
    return mapping.get(priority, EmailTag.NORMAL)


def priority_to_urgency(priority: Priority) -> UrgencyLevel:
    """Convert Priority to UrgencyLevel."""
    mapping = {
        Priority.URGENT: UrgencyLevel.URGENT,
        Priority.IMPORTANT: UrgencyLevel.WARNING,
        Priority.NORMAL: UrgencyLevel.NORMAL,
        Priority.ARCHIVE: UrgencyLevel.ARCHIVED
    }
    return mapping.get(priority, UrgencyLevel.NORMAL)
