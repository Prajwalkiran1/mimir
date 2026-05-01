#!/usr/bin/env python3
"""
Development startup script for Mimir Backend
Run this to start the backend in development mode
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import torch
        import fastapi
        import uvicorn
        logger.info("✅ Core dependencies found")
        return True
    except ImportError as e:
        logger.error(f"❌ Missing dependency: {e}")
        return False

def setup_environment():
    """Setup development environment"""
    # Create necessary directories
    dirs_to_create = [
        'uploads',
        'models',
        'temp',
        'logs'
    ]
    
    for dir_name in dirs_to_create:
        Path(dir_name).mkdir(exist_ok=True)
        logger.info(f"📁 Created directory: {dir_name}")

def check_gpu():
    """Check GPU availability"""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
            logger.info(f"🎮 GPU Available: {gpu_name} ({gpu_memory:.1f}GB)")
            return True
        else:
            logger.info("💻 GPU not available, will use CPU")
            return False
    except Exception as e:
        logger.warning(f"⚠️ GPU check failed: {e}")
        return False

def start_backend():
    """Start the backend server"""
    logger.info("🚀 Starting Mimir Backend Development Server...")
    
    # Set environment variables for development
    os.environ.setdefault('PYTHONPATH', str(Path(__file__).parent))
    os.environ.setdefault('ENVIRONMENT', 'development')
    
    # Import and run the app
    try:
        import uvicorn
        from main import app
        
        # Development configuration
        config = {
            'app': app,
            'host': '0.0.0.0',
            'port': 8000,
            'reload': True,
            'reload_dirs': ['pipeline', 'api', 'models'],
            'log_level': 'info'
        }
        
        logger.info(f"🌐 Server will be available at: http://localhost:{config['port']}")
        logger.info(f"📚 API Documentation: http://localhost:{config['port']}/docs")
        logger.info(f"🏥 Health Check: http://localhost:{config['port']}/health")
        
        # Start the server
        uvicorn.run(**config)
        
    except Exception as e:
        logger.error(f"❌ Failed to start backend: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("=" * 60)
    print("🎬 Mimir Backend Development Server")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        logger.error("❌ Please install dependencies: pip install -r requirements.txt")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Check GPU
    check_gpu()
    
    # Start backend
    start_backend()

if __name__ == "__main__":
    main()
