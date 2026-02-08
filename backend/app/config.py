"""
Configuration management for Email-Manager.
Handles loading and saving config.yaml file.
"""
import yaml
from pathlib import Path
from typing import Dict, Any, Optional


from .utils.paths import get_base_dir


class Config:
    """Configuration manager for Email-Manager."""
    
    CONFIG_PATH = get_base_dir() / "config.yaml"
    
    DEFAULT_CONFIG = {
        "email": {
            "imap_server": "",
            "email": "",
            "password": ""
        },
        "ai": {
            "mode": "hybrid",
            "local": {
                "model": "llama3.1:8b",
                "host": "http://localhost:11434"
            },
            "api": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "key": ""
            },
            "hybrid": {
                "local_model": "llama3.1:8b",
                "api_provider": "openai",
                "api_model": "gpt-4o-mini",
                "api_key": "",
                "confirm_before_api": True
            }
        },
        "sync": {
            "first_sync": {
                "days": 7,
                "batch_size": 10,
                "delay_between_batches_ms": 500
            },
            "incremental_sync": {
                "days": 3,
                "batch_size": 20,
                "delay_between_batches_ms": 200
            },
            "max_emails_per_sync": 200
        },
        "ui": {
            "theme": "light",
            "language": "zh",
            "default_time_range": "本周"
        }
    }
    
    def __init__(self):
        self.data = self.load()
    
    def load(self) -> Dict[str, Any]:
        """Load configuration from file."""
        if self.CONFIG_PATH.exists():
            try:
                with open(self.CONFIG_PATH, 'r', encoding='utf-8') as f:
                    loaded = yaml.safe_load(f)
                    if loaded:
                        return self._merge_defaults(loaded)
            except Exception as e:
                print(f"Error loading config: {e}")
        return self.DEFAULT_CONFIG.copy()
    
    def _merge_defaults(self, loaded: Dict) -> Dict:
        """Merge loaded config with defaults to ensure all keys exist."""
        import copy
        result = copy.deepcopy(self.DEFAULT_CONFIG)
        self._deep_update(result, loaded)
        return result
    
    def _deep_update(self, base: Dict, updates: Dict):
        """Deep update a dictionary."""
        for key, value in updates.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_update(base[key], value)
            else:
                base[key] = value
    
    def save(self):
        """Save configuration to file."""
        with open(self.CONFIG_PATH, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, allow_unicode=True, default_flow_style=False)
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value using dot notation.
        
        Example:
            config.get("ai.mode")  -> "hybrid"
            config.get("email.imap_server")  -> ""
        """
        keys = key.split('.')
        value = self.data
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
                if value is None:
                    return default
            else:
                return default
        return value if value is not None else default
    
    def set(self, key: str, value: Any):
        """
        Set a configuration value using dot notation.
        
        Example:
            config.set("ai.mode", "local")
        """
        keys = key.split('.')
        data = self.data
        
        # Clean value if it's an email setting
        if isinstance(value, str) and key.startswith("email."):
            if key == "email.password":
                # Strip ALL whitespace for passwords (e.g. Gmail app passwords)
                value = "".join(value.split())
            else:
                value = value.replace('\xa0', ' ').strip()
            
        for k in keys[:-1]:
            if k not in data:
                data[k] = {}
            data = data[k]
        data[keys[-1]] = value
        self.save()
    
    def get_email_config(self) -> Dict[str, str]:
        """Get email configuration."""
        return self.data.get("email", {})
    
    def get_ai_config(self) -> Dict[str, Any]:
        """Get AI configuration."""
        return self.data.get("ai", {})
    
    def update_all(self, new_config: Dict[str, Any]):
        """Update entire configuration."""
        self._deep_update(self.data, new_config)
        self.save()
    
    def to_dict(self) -> Dict[str, Any]:
        """Return configuration as dictionary."""
        return self.data.copy()


# Global configuration instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


def reload_config():
    """Reload configuration from file."""
    global _config
    _config = Config()
    return _config
