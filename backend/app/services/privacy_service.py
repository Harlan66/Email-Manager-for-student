"""
Privacy scanning service for Email-Manager.
Detects sensitive content and recommends processing mode.
"""
from typing import List, Tuple, Dict, Any
import re

from ..models import PrivacyLevel, PrivacyScanResult


class PrivacyService:
    """
    Privacy content scanner.
    
    Scans email content for sensitive information and determines
    the appropriate processing mode (local only, API allowed, etc.)
    """
    
    # Extreme sensitivity - completely disable AI processing
    EXTREME_KEYWORDS: List[Tuple[str, str]] = [
        ("password", "密码"),
        ("密码", "密码"),
        ("验证码", "验证码"),
        ("verification code", "验证码"),
        ("PIN", "PIN码"),
        ("PIN码", "PIN码"),
        ("credit card", "信用卡"),
        ("信用卡", "信用卡"),
        ("银行账号", "银行账号"),
        ("account number", "账号"),
        ("身份证号", "身份证号"),
        ("ID number", "身份证号"),
        ("passport", "护照号"),
        ("护照", "护照号"),
        ("HKID", "香港身份证"),
        ("香港身份证", "香港身份证"),
        ("API key", "API密钥"),
        ("api_key", "API密钥"),
        ("token", "令牌"),
        ("secret", "密钥"),
        ("private key", "私钥"),
    ]
    
    # High sensitivity - force local processing
    HIGH_KEYWORDS: List[Tuple[str, str]] = [
        ("transcript", "成绩单"),
        ("成绩单", "成绩单"),
        ("GPA", "GPA"),
        ("成绩", "成绩"),
        ("grade", "成绩"),
        ("排名", "排名"),
        ("ranking", "排名"),
        ("disciplinary", "处分"),
        ("处分", "处分"),
        ("medical", "医疗信息"),
        ("健康", "健康信息"),
        ("health", "健康信息"),
        ("counseling", "心理咨询"),
        ("心理咨询", "心理咨询"),
        ("therapy", "治疗"),
        ("diagnosis", "诊断"),
    ]
    
    # Medium sensitivity - warn user
    MEDIUM_KEYWORDS: List[Tuple[str, str]] = [
        ("phone", "电话号码"),
        ("电话", "电话号码"),
        ("手机", "手机号"),
        ("mobile", "手机号"),
        ("address", "地址"),
        ("地址", "地址"),
        ("住址", "住址"),
    ]
    
    # Patterns for sensitive data detection
    SENSITIVE_PATTERNS = [
        (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', "信用卡号"),  # Credit card
        (r'\b\d{17}[\dXx]\b', "身份证号"),  # Chinese ID
        (r'\b[A-Z]{1,2}\d{6,7}[A-Z0-9]?\b', "香港身份证"),  # HKID
        (r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', "电话号码"),  # Phone number
    ]
    
    @classmethod
    def scan(cls, subject: str, body: str) -> PrivacyScanResult:
        """
        Scan email content for sensitive information.
        
        Args:
            subject: Email subject
            body: Email body text
        
        Returns:
            PrivacyScanResult with level, keywords, reason, and recommendation
        """
        content = f"{subject} {body}".lower()
        
        # Check extreme sensitivity first
        for keyword, label in cls.EXTREME_KEYWORDS:
            if keyword.lower() in content:
                return PrivacyScanResult(
                    level=PrivacyLevel.EXTREME,
                    matched_keywords=[label],
                    reason=f"检测到 '{label}'",
                    recommendation="强制禁用AI，使用规则处理"
                )
        
        # Check patterns
        for pattern, label in cls.SENSITIVE_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                return PrivacyScanResult(
                    level=PrivacyLevel.EXTREME,
                    matched_keywords=[label],
                    reason=f"检测到 '{label}' 格式数据",
                    recommendation="强制禁用AI，使用规则处理"
                )
        
        # Check high sensitivity
        for keyword, label in cls.HIGH_KEYWORDS:
            if keyword.lower() in content:
                return PrivacyScanResult(
                    level=PrivacyLevel.HIGH,
                    matched_keywords=[label],
                    reason=f"检测到 '{label}'",
                    recommendation="强制使用本地模型"
                )
        
        # Check medium sensitivity
        matched_medium = []
        for keyword, label in cls.MEDIUM_KEYWORDS:
            if keyword.lower() in content and label not in matched_medium:
                matched_medium.append(label)
        
        if matched_medium:
            return PrivacyScanResult(
                level=PrivacyLevel.NORMAL,  # Still allow processing but note the sensitivity
                matched_keywords=matched_medium,
                reason=f"检测到 {', '.join(matched_medium)}",
                recommendation="建议使用本地模型"
            )
        
        # Normal - no sensitive content detected
        return PrivacyScanResult(
            level=PrivacyLevel.NORMAL,
            matched_keywords=[],
            reason="无敏感内容",
            recommendation="可使用任意处理模式"
        )
    
    @classmethod
    def should_use_local(cls, scan_result: PrivacyScanResult) -> bool:
        """
        Determine if local processing should be used based on scan result.
        
        Returns:
            True if local processing is required or recommended
        """
        return scan_result.level in [PrivacyLevel.EXTREME, PrivacyLevel.HIGH]
    
    @classmethod
    def should_disable_ai(cls, scan_result: PrivacyScanResult) -> bool:
        """
        Determine if AI should be completely disabled.
        
        Returns:
            True if AI processing should be disabled
        """
        return scan_result.level == PrivacyLevel.EXTREME
    
    @classmethod
    def get_processing_note(cls, scan_result: PrivacyScanResult, ai_model: str) -> str:
        """
        Generate a processing note for display.
        
        Args:
            scan_result: Privacy scan result
            ai_model: The AI model used for processing
        
        Returns:
            Human-readable processing note
        """
        if scan_result.level == PrivacyLevel.EXTREME:
            return f"🚫 已禁用AI处理 (检测到敏感内容: {', '.join(scan_result.matched_keywords)})"
        elif scan_result.level == PrivacyLevel.HIGH:
            return f"🔒 本地处理 ({ai_model}) - 检测到隐私内容"
        else:
            return f"✅ {ai_model}"


# Convenience function
def scan_privacy(subject: str, body: str) -> PrivacyScanResult:
    """Convenience function to scan privacy of email content."""
    return PrivacyService.scan(subject, body)
