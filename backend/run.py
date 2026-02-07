import uvicorn
import multiprocessing
import webbrowser
import threading
import time
import sys
import os
from app.main import app

def open_browser():
    """Wait for server to start and open browser."""
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    # Required for Windows multiprocessing
    multiprocessing.freeze_support()
    
    print("*" * 50)
    print("Email-Manager 正在启动...")
    print("访问地址: http://127.0.0.1:8000")
    print("*" * 50)
    
    # Start browser thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run uvicorn
    uvicorn.run(
        "app.main:app", 
        host="127.0.0.1", 
        port=8000, 
        log_level="info",
        reload=False  # No reload in bundled app
    )
