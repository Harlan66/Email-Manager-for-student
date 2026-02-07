import uvicorn
import webview
import threading
import sys
import os
import time
from app.main import app

def start_server():
    """Start the FastAPI server."""
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        log_level="error",
        reload=False
    )

if __name__ == "__main__":
    # Start the server in a separate thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait a moment for server to initialize
    time.sleep(2)

    # Create the desktop window
    print("Email-Manager 桌面端正在启动...")
    window = webview.create_window(
        'Email Manager', 
        'http://127.0.0.1:8000',
        width=1200,
        height=800,
        min_size=(800, 600)
    )
    
    # Start the webview loop
    webview.start()
