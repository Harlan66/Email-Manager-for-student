"""
IMAP service for Email-Manager.
Handles email fetching from IMAP servers.
"""
import logging
from imap_tools import MailBox, AND
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import uuid

logger = logging.getLogger(__name__)


class IMAPService:
    """IMAP email fetching service."""
    
    def __init__(self, server: str, email: str, password: str):
        self.server = server
        self.email = email
        self.password = password
        self.mailbox: Optional[MailBox] = None
    
    def connect(self) -> bool:
        """Connect to IMAP server."""
        try:
            self.mailbox = MailBox(self.server).login(self.email, self.password)
            return True
        except Exception as e:
            logger.error(f"IMAP connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from IMAP server."""
        if self.mailbox:
            try:
                self.mailbox.logout()
            except Exception:
                pass
            self.mailbox = None
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test IMAP connection and return server info.
        
        Returns:
            {
                "success": bool,
                "message": str,
                "folders": List[str],
                "inbox_count": int
            }
        """
        try:
            with MailBox(self.server).login(self.email, self.password) as mailbox:
                # Get folder list
                folders = [f.name for f in mailbox.folder.list()]
                
                # Get inbox count
                mailbox.folder.set('INBOX')
                # Count all emails in inbox
                all_emails = list(mailbox.fetch(limit=1, reverse=True))
                
                return {
                    "success": True,
                    "message": "连接成功",
                    "folders": folders[:10],  # Limit to 10 folders
                    "inbox_count": len(folders)  # Approximate
                }
        except Exception as e:
            error_message = str(e)
            
            # Provide helpful error messages
            if "authentication" in error_message.lower():
                error_message = "认证失败，请检查邮箱地址和应用密码"
            elif "connect" in error_message.lower():
                error_message = f"无法连接到服务器 {self.server}"
            elif "ssl" in error_message.lower():
                error_message = "SSL连接失败，请检查服务器设置"
            
            return {
                "success": False,
                "message": error_message,
                "folders": [],
                "inbox_count": 0
            }
    
    def fetch_recent(self, days: int = 7, limit: int = 500) -> List[Dict[str, Any]]:
        """
        Fetch recent emails from inbox.
        
        Args:
            days: Number of days to look back
            limit: Maximum number of emails to fetch
        
        Returns:
            List of email dictionaries
        """
        if not self.mailbox:
            raise Exception("Not connected to IMAP server")
        
        since_date = (datetime.now() - timedelta(days=days)).date()
        emails = []
        
        try:
            # Use headers_only=True by default to reduce bandwidth and avoid OVERQUOTA
            # We only fetch the full body when we actually need it in the sync process
            for msg in self.mailbox.fetch(AND(date_gte=since_date), limit=limit, reverse=True, headers_only=True):
                emails.append(self._msg_to_dict(msg))
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            raise
        
        return emails

    def fetch_uids(self, days: int = 7) -> List[str]:
        """Fetch UIDs of emails in the given date range."""
        if not self.mailbox:
            raise Exception("Not connected to IMAP server")
        
        since_date = (datetime.now() - timedelta(days=days)).date()
        try:
            return self.mailbox.uids(AND(date_gte=since_date))
        except Exception as e:
            logger.error(f"Error fetching UIDs: {e}")
            return []

    def fetch_by_uids(self, uids: List[str]) -> List[Dict[str, Any]]:
        """Fetch full email content for specific UIDs."""
        if not self.mailbox or not uids:
            return []
        
        emails = []
        try:
            # Fetch in small batches to avoid command length limits or timeout
            batch_size = 20
            for i in range(0, len(uids), batch_size):
                batch = uids[i:i + batch_size]
                for msg in self.mailbox.fetch(AND(uid=batch)):
                    emails.append(self._msg_to_dict(msg))
        except Exception as e:
            logger.error(f"Error fetching emails by UIDs: {e}")
            raise
        
        return emails

    def _msg_to_dict(self, msg) -> Dict[str, Any]:
        """Convert imap_tools message to dictionary."""
        # Generate a unique ID if UID is not available
        email_id = str(msg.uid) if msg.uid else str(uuid.uuid4())
        
        # Extract sender info
        sender_email = msg.from_ or ""
        sender_name = ""
        if msg.from_values:
            sender_name = msg.from_values.name or ""
        
        # Get email body
        body_text = msg.text or ""
        body_html = msg.html or ""
        
        # Count attachments
        attachments = list(msg.attachments)
        
        return {
            "id": email_id,
            "subject": msg.subject or "(无主题)",
            "sender_email": sender_email,
            "sender_name": sender_name or self._extract_name_from_email(sender_email),
            "date_received": msg.date,
            "body_text": body_text,
            "body_html": body_html,
            "has_attachments": len(attachments) > 0,
            "attachment_count": len(attachments)
        }
    
    def fetch_all(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch all emails from inbox.
        
        Args:
            limit: Maximum number of emails to fetch
        
        Returns:
            List of email dictionaries
        """
        if not self.mailbox:
            raise Exception("Not connected to IMAP server")
        
        emails = []
        
        try:
            for msg in self.mailbox.fetch(limit=limit, reverse=True):
                email_id = str(msg.uid) if msg.uid else str(uuid.uuid4())
                
                sender_email = msg.from_ or ""
                sender_name = ""
                if msg.from_values:
                    sender_name = msg.from_values.name or ""
                
                body_text = msg.text or ""
                body_html = msg.html or ""
                
                attachments = list(msg.attachments)
                
                emails.append({
                    "id": email_id,
                    "subject": msg.subject or "(无主题)",
                    "sender_email": sender_email,
                    "sender_name": sender_name or self._extract_name_from_email(sender_email),
                    "date_received": msg.date,
                    "body_text": body_text,
                    "body_html": body_html,
                    "has_attachments": len(attachments) > 0,
                    "attachment_count": len(attachments)
                })
        except Exception as e:
            logger.error(f"Error fetching all emails: {e}")
            raise
        
        return emails
    
    def _extract_name_from_email(self, email: str) -> str:
        """Extract a display name from email address."""
        if not email:
            return "未知发件人"
        
        # Get the part before @
        local_part = email.split('@')[0] if '@' in email else email
        
        # Clean up common patterns
        local_part = local_part.replace('.', ' ').replace('_', ' ').replace('-', ' ')
        
        # Capitalize words
        return ' '.join(word.capitalize() for word in local_part.split())


def create_imap_service(server: str, email: str, password: str) -> IMAPService:
    """Factory function to create IMAP service."""
    return IMAPService(server, email, password)
