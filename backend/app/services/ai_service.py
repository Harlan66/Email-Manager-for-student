"""
AI service for Email-Manager.
Handles email classification, summarization, and deadline extraction.
Supports three modes: local (Ollama), API (OpenAI), and hybrid.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..models import (
    Email, Priority, AIMode, PrivacyLevel,
    priority_to_tag, priority_to_urgency
)
from ..config import get_config
from .privacy_service import PrivacyService
from ..utils.date_parser import parse_deadline, format_relative_time


class AIService:
    """
    AI processing service for email classification and analysis.
    
    Supports three modes:
    - local: 100% local processing using Ollama
    - api: 100% cloud API processing (OpenAI/Anthropic/国产服务商)
    - hybrid: Simple tasks local, complex tasks API
    
    Supported API providers:
    - openai: OpenAI (GPT-4o-mini, GPT-4o)
    - anthropic: Anthropic (Claude)
    - deepseek: DeepSeek (deepseek-chat, deepseek-coder)
    - glm: 智谱GLM (glm-4-flash, glm-4)
    - qwen: 通义千问 (qwen-turbo, qwen-plus)
    - minimax: MiniMax (abab6.5s-chat)
    - moonshot: Kimi/Moonshot (moonshot-v1-8k)
    """
    
    # 各服务商API配置
    PROVIDER_CONFIG = {
        "openai": {
            "base_url": "https://api.openai.com/v1",
            "default_model": "gpt-4o-mini",
            "models": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
        },
        "anthropic": {
            "base_url": "https://api.anthropic.com",
            "default_model": "claude-3-haiku-20240307",
            "models": ["claude-3-haiku-20240307", "claude-3-sonnet-20240229"]
        },
        "deepseek": {
            "base_url": "https://api.deepseek.com/v1",
            "default_model": "deepseek-chat",
            "models": ["deepseek-chat", "deepseek-coder"]
        },
        "glm": {
            "base_url": "https://open.bigmodel.cn/api/paas/v4",
            "default_model": "glm-4-flash",
            "models": ["glm-4-flash", "glm-4", "glm-4-air"]
        },
        "qwen": {
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "default_model": "qwen-turbo",
            "models": ["qwen-turbo", "qwen-plus", "qwen-max"]
        },
        "minimax": {
            "base_url": "https://api.minimax.chat/v1",
            "default_model": "abab6.5s-chat",
            "models": ["abab6.5s-chat", "abab5.5-chat"]
        },
        "moonshot": {
            "base_url": "https://api.moonshot.cn/v1",
            "default_model": "moonshot-v1-8k",
            "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"]
        }
    }
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        if config is None:
            config = get_config().get_ai_config()
        
        self.config = config
        self.mode = AIMode(config.get("mode", "hybrid"))
        
        # Local config
        local_config = config.get("local", {})
        self.local_model = local_config.get("model", "llama3.1:8b")
        self.local_host = local_config.get("host", "http://localhost:11434")
        
        # API config
        api_config = config.get("api", {})
        self.api_provider = api_config.get("provider", "openai")
        self.api_model = api_config.get("model", "gpt-4o-mini")
        self.api_key = api_config.get("key", "")
        
        # Hybrid config
        hybrid_config = config.get("hybrid", {})
        self.hybrid_local_model = hybrid_config.get("local_model", "llama3.1:8b")
        self.hybrid_api_provider = hybrid_config.get("api_provider", "openai")
        self.hybrid_api_model = hybrid_config.get("api_model", "gpt-4o-mini")
        self.confirm_before_api = hybrid_config.get("confirm_before_api", True)
        
        # UI language setting for AI summary output
        ui_config = get_config().data.get("ui", {})
        self.language = ui_config.get("language", "zh")
    
    def _get_api_client(self, provider: str = None):
        """获取指定服务商的API客户端（OpenAI兼容格式）"""
        import openai
        
        provider = provider or self.api_provider
        provider_config = self.PROVIDER_CONFIG.get(provider, self.PROVIDER_CONFIG["openai"])
        
        return openai.OpenAI(
            api_key=self.api_key,
            base_url=provider_config["base_url"]
        )
    
    def _call_api(self, messages: list, provider: str = None, model: str = None, max_tokens: int = 150) -> str:
        """统一的API调用方法，支持所有兼容OpenAI格式的服务商"""
        try:
            provider = provider or self.api_provider
            model = model or self.api_model
            
            client = self._get_api_client(provider)
            
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"API call failed ({provider}/{model}): {e}")
            return ""
    
    def process_email(self, email_data: Dict[str, Any]) -> Email:
        """
        Process an email with AI classification and analysis.
        
        Args:
            email_data: Raw email data from IMAP
        
        Returns:
            Processed Email object with AI analysis results
        """
        subject = email_data.get("subject", "")
        body = email_data.get("body_text", "")
        
        # Step 1: Privacy scan
        privacy_result = PrivacyService.scan(subject, body)
        
        # Step 2: Determine processing mode based on privacy level
        if PrivacyService.should_disable_ai(privacy_result):
            # Use rule-based processing only
            email = self._rule_based_process(email_data, privacy_result)
        elif PrivacyService.should_use_local(privacy_result):
            # Force local processing
            email = self._process_local(email_data, privacy_result)
        else:
            # Use configured mode
            if self.mode == AIMode.LOCAL:
                email = self._process_local(email_data, privacy_result)
            elif self.mode == AIMode.API:
                email = self._process_api(email_data, privacy_result)
            else:  # HYBRID
                email = self._process_hybrid(email_data, privacy_result)
        
        return email
    
    def _rule_based_process(self, email_data: Dict[str, Any], privacy_result) -> Email:
        """
        Process email using rule-based classification (no AI).
        Used when privacy level is extreme.
        """
        subject = email_data.get("subject", "").lower()
        body = email_data.get("body_text", "").lower()
        content = f"{subject} {body}"
        
        # Rule-based priority classification
        priority = Priority.NORMAL
        
        # Urgent keywords
        urgent_keywords = [
            "urgent", "紧急", "deadline", "截止", "due", "考试", "exam",
            "immediately", "立即", "asap", "重要通知"
        ]
        for kw in urgent_keywords:
            if kw in content:
                priority = Priority.URGENT
                break
        
        # Important keywords (if not already urgent)
        if priority != Priority.URGENT:
            important_keywords = [
                "assignment", "作业", "quiz", "测验", "grade", "成绩",
                "submission", "提交", "注册", "register"
            ]
            for kw in important_keywords:
                if kw in content:
                    priority = Priority.IMPORTANT
                    break
        
        # Extract tags
        tags = self._extract_tags_rule_based(subject, body)
        
        # Extract deadline
        deadline_str = self._extract_deadline_rule_based(subject, body)
        
        # Create Email object
        date_received = email_data.get("date_received")
        if isinstance(date_received, str):
            try:
                date_received = datetime.fromisoformat(date_received)
            except ValueError:
                date_received = datetime.now()
        
        return Email(
            id=email_data.get("id", ""),
            tag=priority_to_tag(priority),
            urgency=priority_to_urgency(priority),
            subject=email_data.get("subject", ""),
            sender_name=email_data.get("sender_name", ""),
            sender_email=email_data.get("sender_email", ""),
            time=format_relative_time(date_received),
            has_deadline=bool(deadline_str),
            deadline=deadline_str,
            has_attachments=email_data.get("has_attachments", False),
            attachment_count=email_data.get("attachment_count", 0),
            summary="(隐私保护模式，AI摘要已禁用)",
            ai_model="rule_based",
            tags=tags,
            body=email_data.get("body_text", ""),
            is_read=False,
            is_archived=False,
            date_received=date_received,
            body_html=email_data.get("body_html"),
            priority=priority,
            ai_processed=True,
            ai_mode=None,
            privacy_level=privacy_result.level
        )
    
    def _process_local(self, email_data: Dict[str, Any], privacy_result) -> Email:
        """Process email using local Ollama model."""
        subject = email_data.get("subject", "")
        body = email_data.get("body_text", "")
        
        # Classification
        priority = self._classify_local(subject, body)
        
        # Tag extraction
        tags = self._extract_tags_local(subject, body)
        
        # Deadline extraction
        deadline_str = self._extract_deadline_local(subject, body)
        
        # Summary generation
        summary = self._summarize_local(body) if len(body) > 100 else ""
        
        # Create Email object
        date_received = email_data.get("date_received")
        if isinstance(date_received, str):
            try:
                date_received = datetime.fromisoformat(date_received)
            except ValueError:
                date_received = datetime.now()
        
        return Email(
            id=email_data.get("id", ""),
            tag=priority_to_tag(priority),
            urgency=priority_to_urgency(priority),
            subject=subject,
            sender_name=email_data.get("sender_name", ""),
            sender_email=email_data.get("sender_email", ""),
            time=format_relative_time(date_received),
            has_deadline=bool(deadline_str),
            deadline=deadline_str,
            has_attachments=email_data.get("has_attachments", False),
            attachment_count=email_data.get("attachment_count", 0),
            summary=summary,
            ai_model=f"本地模型 ({self.local_model})",
            tags=tags,
            body=body,
            is_read=False,
            is_archived=False,
            date_received=date_received,
            body_html=email_data.get("body_html"),
            priority=priority,
            ai_processed=True,
            ai_mode=AIMode.LOCAL,
            privacy_level=privacy_result.level
        )
    
    def _process_api(self, email_data: Dict[str, Any], privacy_result) -> Email:
        """Process email using cloud API."""
        subject = email_data.get("subject", "")
        body = email_data.get("body_text", "")
        
        # Try API processing, fall back to local if no API key
        if not self.api_key:
            return self._process_local(email_data, privacy_result)
        
        # Classification
        priority = self._classify_api(subject, body)
        
        # Tag extraction
        tags = self._extract_tags_api(subject, body)
        
        # Deadline extraction
        deadline_str = self._extract_deadline_api(subject, body)
        
        # Summary generation
        summary = self._summarize_api(body) if len(body) > 100 else ""
        
        # Create Email object
        date_received = email_data.get("date_received")
        if isinstance(date_received, str):
            try:
                date_received = datetime.fromisoformat(date_received)
            except ValueError:
                date_received = datetime.now()
        
        return Email(
            id=email_data.get("id", ""),
            tag=priority_to_tag(priority),
            urgency=priority_to_urgency(priority),
            subject=subject,
            sender_name=email_data.get("sender_name", ""),
            sender_email=email_data.get("sender_email", ""),
            time=format_relative_time(date_received),
            has_deadline=bool(deadline_str),
            deadline=deadline_str,
            has_attachments=email_data.get("has_attachments", False),
            attachment_count=email_data.get("attachment_count", 0),
            summary=summary,
            ai_model=f"API ({self.api_model})",
            tags=tags,
            body=body,
            is_read=False,
            is_archived=False,
            date_received=date_received,
            body_html=email_data.get("body_html"),
            priority=priority,
            ai_processed=True,
            ai_mode=AIMode.API,
            privacy_level=privacy_result.level
        )
    
    def _process_hybrid(self, email_data: Dict[str, Any], privacy_result) -> Email:
        """
        Process email using hybrid mode.
        - Basic tasks (classification, tags, deadline): Local
        - Complex tasks (long summary): API
        """
        subject = email_data.get("subject", "")
        body = email_data.get("body_text", "")
        
        # Basic tasks always local
        priority = self._classify_local(subject, body)
        tags = self._extract_tags_local(subject, body)
        deadline_str = self._extract_deadline_local(subject, body)
        
        # Summary: use API for long emails if key available
        model_used = self.hybrid_local_model
        if len(body) > 500 and self.api_key:
            summary = self._summarize_api(body)
            model_used = f"混合 ({self.hybrid_api_model})"
        else:
            summary = self._summarize_local(body) if len(body) > 100 else ""
            model_used = f"混合 ({self.hybrid_local_model})"
        
        # Create Email object
        date_received = email_data.get("date_received")
        if isinstance(date_received, str):
            try:
                date_received = datetime.fromisoformat(date_received)
            except ValueError:
                date_received = datetime.now()
        
        return Email(
            id=email_data.get("id", ""),
            tag=priority_to_tag(priority),
            urgency=priority_to_urgency(priority),
            subject=subject,
            sender_name=email_data.get("sender_name", ""),
            sender_email=email_data.get("sender_email", ""),
            time=format_relative_time(date_received),
            has_deadline=bool(deadline_str),
            deadline=deadline_str,
            has_attachments=email_data.get("has_attachments", False),
            attachment_count=email_data.get("attachment_count", 0),
            summary=summary,
            ai_model=model_used,
            tags=tags,
            body=body,
            is_read=False,
            is_archived=False,
            date_received=date_received,
            body_html=email_data.get("body_html"),
            priority=priority,
            ai_processed=True,
            ai_mode=AIMode.HYBRID,
            privacy_level=privacy_result.level
        )
    
    # === Local Model Methods ===
    
    def _classify_local(self, subject: str, body: str) -> Priority:
        """Classify email using local Ollama model."""
        try:
            import ollama
            
            prompt = f"""分类以下学校邮件的优先级。
可选: urgent(紧急), important(重要), normal(日常), archive(归档)

判断标准:
- urgent: deadline < 3天, 考试通知, 紧急行政通知
- important: 作业, 小测, 成绩相关, 注册通知
- normal: 一般通知, 活动邀请, 新闻
- archive: 确认邮件, 广告, 已过期

主题: {subject}
内容: {body[:500]}

只返回一个单词: urgent/important/normal/archive"""
            
            response = ollama.chat(
                model=self.local_model,
                messages=[{"role": "user", "content": prompt}]
            )
            result = response['message']['content'].strip().lower()
            
            if "urgent" in result:
                return Priority.URGENT
            elif "important" in result:
                return Priority.IMPORTANT
            elif "archive" in result:
                return Priority.ARCHIVE
            else:
                return Priority.NORMAL
        except Exception as e:
            print(f"Local classification failed: {e}")
            # Fall back to rule-based
            return self._classify_rule_based(subject, body)
    
    def _classify_rule_based(self, subject: str, body: str) -> Priority:
        """Rule-based classification fallback."""
        content = f"{subject} {body}".lower()
        
        urgent_keywords = ["urgent", "紧急", "deadline", "截止", "考试", "exam", "asap"]
        for kw in urgent_keywords:
            if kw in content:
                return Priority.URGENT
        
        important_keywords = ["assignment", "作业", "quiz", "测验", "grade", "成绩"]
        for kw in important_keywords:
            if kw in content:
                return Priority.IMPORTANT
        
        return Priority.NORMAL
    
    def _extract_tags_local(self, subject: str, body: str) -> List[str]:
        """Extract tags using local model."""
        try:
            import ollama
            
            prompt = f"""从以下邮件中提取2-4个关键标签词。
返回格式: tag1, tag2, tag3

主题: {subject}
内容: {body[:300]}

标签:"""
            
            response = ollama.chat(
                model=self.local_model,
                messages=[{"role": "user", "content": prompt}]
            )
            result = response['message']['content'].strip()
            
            # Parse tags from response
            tags = [t.strip().lower() for t in result.split(',')]
            return [t for t in tags if t and len(t) < 20][:4]
        except Exception:
            return self._extract_tags_rule_based(subject, body)
    
    def _extract_tags_rule_based(self, subject: str, body: str) -> List[str]:
        """Rule-based tag extraction fallback."""
        content = f"{subject} {body}".lower()
        tags = []
        
        tag_keywords = {
            "assignment": ["assignment", "作业", "homework"],
            "deadline": ["deadline", "截止", "due"],
            "exam": ["exam", "考试", "quiz", "测验"],
            "lecture": ["lecture", "课程", "class"],
            "career": ["career", "招聘", "job", "实习"],
            "newsletter": ["newsletter", "通讯", "news"],
            "grade": ["grade", "成绩", "score"],
            "project": ["project", "项目"],
        }
        
        for tag, keywords in tag_keywords.items():
            for kw in keywords:
                if kw in content:
                    tags.append(tag)
                    break
        
        return tags[:4]
    
    def _extract_deadline_local(self, subject: str, body: str) -> Optional[str]:
        """Extract deadline using local model."""
        # First try rule-based extraction
        deadline = parse_deadline(f"{subject} {body}")
        if deadline:
            return deadline.strftime("%Y-%m-%d")
        
        # Could add LLM-based extraction here if needed
        return None
    
    def _extract_deadline_rule_based(self, subject: str, body: str) -> Optional[str]:
        """Rule-based deadline extraction."""
        deadline = parse_deadline(f"{subject} {body}")
        if deadline:
            return deadline.strftime("%Y-%m-%d")
        return None
    
    def _summarize_local(self, text: str) -> str:
        """Generate summary using local model."""
        try:
            import ollama
            
            # Dynamic language for summary output
            if self.language == "en":
                prompt = f"""Summarize the following email in 2-3 sentences:

{text[:1500]}

Summary:"""
            else:
                prompt = f"""用2-3句话总结以下邮件的关键信息:

{text[:1500]}

摘要:"""
            
            response = ollama.chat(
                model=self.local_model,
                messages=[{"role": "user", "content": prompt}]
            )
            return response['message']['content'].strip()
        except Exception as e:
            print(f"Local summarization failed: {e}")
            return ""
    
    # === API Model Methods ===
    
    def _classify_api(self, subject: str, body: str) -> Priority:
        """Classify email using API."""
        try:
            import openai
            
            client = openai.OpenAI(api_key=self.api_key)
            
            response = client.chat.completions.create(
                model=self.api_model,
                messages=[{
                    "role": "user",
                    "content": f"""分类以下学校邮件的优先级。只返回一个单词: urgent/important/normal/archive

主题: {subject}
内容: {body[:500]}"""
                }],
                max_tokens=10
            )
            result = response.choices[0].message.content.strip().lower()
            
            if "urgent" in result:
                return Priority.URGENT
            elif "important" in result:
                return Priority.IMPORTANT
            elif "archive" in result:
                return Priority.ARCHIVE
            else:
                return Priority.NORMAL
        except Exception as e:
            print(f"API classification failed: {e}")
            return self._classify_rule_based(subject, body)
    
    def _extract_tags_api(self, subject: str, body: str) -> List[str]:
        """Extract tags using API."""
        try:
            import openai
            
            client = openai.OpenAI(api_key=self.api_key)
            
            response = client.chat.completions.create(
                model=self.api_model,
                messages=[{
                    "role": "user",
                    "content": f"""从以下邮件中提取2-4个英文关键标签词，用逗号分隔:

主题: {subject}
内容: {body[:300]}"""
                }],
                max_tokens=50
            )
            result = response.choices[0].message.content.strip()
            
            tags = [t.strip().lower() for t in result.split(',')]
            return [t for t in tags if t and len(t) < 20][:4]
        except Exception:
            return self._extract_tags_rule_based(subject, body)
    
    def _extract_deadline_api(self, subject: str, body: str) -> Optional[str]:
        """Extract deadline using API."""
        # Use rule-based for now, could enhance with API
        return self._extract_deadline_rule_based(subject, body)
    
    def _summarize_api(self, text: str) -> str:
        """Generate summary using API."""
        try:
            import openai
            
            client = openai.OpenAI(api_key=self.api_key)
            
            # Dynamic language for summary output
            if self.language == "en":
                prompt = f"""Summarize the following email in 2-3 concise sentences:

{text[:2000]}"""
            else:
                prompt = f"""用2-3句中文总结以下邮件的关键信息:

{text[:2000]}"""
            
            response = client.chat.completions.create(
                model=self.api_model,
                messages=[{
                    "role": "user",
                    "content": prompt
                }],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"API summarization failed: {e}")
            return ""
    
    # === Connection Test Methods ===
    
    def test_local_connection(self) -> Dict[str, Any]:
        """Test Ollama local connection."""
        try:
            import ollama
            
            models = ollama.list()
            model_names = [m['name'] for m in models.get('models', [])]
            
            return {
                "success": True,
                "message": "Ollama连接成功",
                "available_models": model_names[:5],
                "target_model_available": self.local_model in str(model_names)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Ollama连接失败: {str(e)}",
                "available_models": [],
                "target_model_available": False
            }
    
    def test_api_connection(self) -> Dict[str, Any]:
        """Test API connection."""
        if not self.api_key:
            return {
                "success": False,
                "message": "未设置API密钥",
                "models": []
            }
        
        try:
            import openai
            
            client = openai.OpenAI(api_key=self.api_key)
            models = client.models.list()
            
            return {
                "success": True,
                "message": "API连接成功",
                "models": [m.id for m in list(models)[:5]]
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"API连接失败: {str(e)}",
                "models": []
            }


# Global AI service instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get the global AI service instance."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service


def reload_ai_service():
    """Reload AI service with new configuration."""
    global _ai_service
    _ai_service = AIService()
    return _ai_service
