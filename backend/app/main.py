"""
FastAPI main application entry point for Email-Manager.
"""
import logging
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routers import emails, stats, settings
from .database import get_database
from .utils.paths import get_resource_dir, get_logs_dir

# Configure logging
def setup_logging():
    """Setup logging to console and file."""
    logs_dir = get_logs_dir()
    log_file = logs_dir / "email_manager.log"
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # File handler with rotation (5MB max, keep 3 backups)
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5*1024*1024,
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Also configure uvicorn loggers
    for logger_name in ['uvicorn', 'uvicorn.access', 'uvicorn.error']:
        logger = logging.getLogger(logger_name)
        logger.handlers = []
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
    
    logging.info(f"Logging initialized. Log file: {log_file}")

setup_logging()
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Email-Manager API",
    description="学生邮件智能管理工具后端API",
    version="1.0.0"
)

# Static files configuration
resource_dir = get_resource_dir()
web_dir = resource_dir / "web"


# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(emails.router, prefix="/api", tags=["emails"])
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(settings.router, prefix="/api", tags=["settings"])


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    get_database()  # Initialize database


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

# Serve frontend static files
if web_dir.exists():
    # Mount assets directory if it exists
    assets_dir = web_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Catch-all route to serve the SPA or individual files."""
        if full_path.startswith("api/"):
            return {"error": "Not Found"}
            
        file_path = web_dir / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
            
        index_html = web_dir / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))
        
        return {"message": "Email-Manager API is running, but UI assets not found."}
else:
    @app.get("/")
    async def root():
        """Fallback root if UI not bundled."""
        return {
            "message": "Email-Manager API",
            "info": "Frontend assets not found. Use dev server or bundle UI."
        }

