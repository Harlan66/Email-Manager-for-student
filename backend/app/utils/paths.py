import os
import sys
from pathlib import Path

def get_base_dir() -> Path:
    """
    Get the directory where data (config, db) should be stored.
    When running as EXE, this is the folder containing the EXE.
    """
    if getattr(sys, 'frozen', False):
        # Running as a bundled executable
        return Path(os.path.dirname(sys.executable))
    else:
        # Running as a normal Python script
        return Path(__file__).parent.parent.parent

def get_resource_dir() -> Path:
    """
    Get the directory for internal resources (static files).
    In PyInstaller, these are in sys._MEIPASS.
    """
    if getattr(sys, 'frozen', False):
        return Path(getattr(sys, '_MEIPASS', os.path.dirname(sys.executable)))
    else:
        return Path(__file__).parent.parent.parent
