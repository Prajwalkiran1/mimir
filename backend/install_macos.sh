#!/bin/bash

# macOS Installation Script for Mimir Backend
# Fixes scipy OpenBLAS dependency issues

set -e

echo "🍎 Installing Mimir Backend on macOS..."
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    print_error "Homebrew not found. Please install Homebrew first:"
    echo "https://brew.sh/"
    exit 1
fi

print_status "Homebrew found"

# Install system dependencies
echo ""
echo "📦 Installing system dependencies..."
brew install python@3.10 ffmpeg pkg-config

# Create virtual environment
echo ""
echo "🐍 Creating Python virtual environment..."
python3.10 -m venv venv
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install main requirements in stages to avoid conflicts
echo ""
echo "📚 Installing core dependencies..."
pip install --no-cache-dir numpy==1.26.4 scipy==1.13.1 scikit-learn==1.4.2

echo ""
echo "🔧 Installing ML dependencies..."
pip install --no-cache-dir transformers==4.40.2 tokenizers==0.19.1 torch>=2.0.0 torchaudio>=2.0.0

echo ""
echo "🎵 Installing audio processing dependencies..."
pip install --no-cache-dir faster-whisper>=1.1.1 stable-ts

echo ""
echo "📦 Installing remaining dependencies..."
pip install --no-cache-dir nltk pandas tqdm opencv-python-headless Pillow ffmpeg-python sentence-transformers==2.7.0 faiss-cpu networkx spacy datasets accelerate pyyaml requests aiofiles redis>=4.0.0 celery>=5.0.0

# Install spaCy model
print_status "Downloading spaCy model..."
python -m spacy download en_core_web_sm

# Install problematic packages separately with specific flags
echo ""
echo "🔧 Installing complex audio packages..."
print_warning "Installing pyannote.audio (this may take a while)..."

# Install pyannote.audio with specific flags for macOS
pip install --no-cache-dir --no-build-isolation pyannote.audio==3.1.1

print_warning "Installing whisperx (this may take a while)..."
pip install --no-cache-dir --no-build-isolation whisperx

# Install additional dependencies
echo ""
echo "📦 Installing additional dependencies..."
pip install nltk pandas tqdm

# Download NLTK data
print_status "Downloading NLTK data..."
python -c "
import nltk
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)
"

# Create necessary directories
echo ""
echo "📁 Creating directories..."
mkdir -p uploads models temp logs

# Test installation
echo ""
echo "🧪 Testing installation..."
python -c "
try:
    import torch
    print('✅ PyTorch:', torch.__version__)
    print('✅ CUDA available:', torch.cuda.is_available())
except ImportError as e:
    print('❌ PyTorch import failed:', e)

try:
    import numpy as np
    print('✅ NumPy:', np.__version__)
except ImportError as e:
    print('❌ NumPy import failed:', e)

try:
    import scipy
    print('✅ SciPy:', scipy.__version__)
except ImportError as e:
    print('❌ SciPy import failed:', e)

try:
    import transformers
    print('✅ Transformers:', transformers.__version__)
except ImportError as e:
    print('❌ Transformers import failed:', e)

try:
    import whisperx
    print('✅ WhisperX installed')
except ImportError as e:
    print('❌ WhisperX import failed:', e)

try:
    import pyannote.audio
    print('✅ Pyannote.audio installed')
except ImportError as e:
    print('❌ Pyannote.audio import failed:', e)
"

echo ""
print_status "Installation completed!"
echo ""
echo "🚀 To start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python start_dev.py"
echo ""
echo "📚 If you encounter issues with pyannote.audio or whisperx:"
echo "   1. Try installing without --no-build-isolation"
echo "   2. Install using conda instead of pip"
echo "   3. Use CPU-only versions if GPU installation fails"
