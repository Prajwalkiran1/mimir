#!/bin/bash

# Quick fix for dependency conflicts
# Run this if you're getting faster-whisper version conflicts

set -e

echo "🔧 Fixing Mimir Backend Dependencies"
echo "=================================="

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

# Activate virtual environment
if [ ! -d "venv" ]; then
    print_error "Virtual environment not found. Run install_macos.sh first."
    exit 1
fi

source venv/bin/activate

# Clean existing packages
echo ""
echo "🧹 Cleaning existing packages..."
pip uninstall -y whisperx pyannote.audio faster-whisper scipy scikit-learn 2>/dev/null || true

# Install core packages first
echo ""
echo "📦 Installing core packages..."
pip install --no-cache-dir numpy==1.26.4
pip install --no-cache-dir torch>=2.0.0
pip install --no-cache-dir transformers==4.40.2
pip install --no-cache-dir tokenizers==0.19.1

# Install faster-whisper with compatible version
echo ""
echo "🎵 Installing faster-whisper..."
pip install --no-cache-dir "faster-whisper>=1.1.1"

# Install scipy and scikit-learn
echo ""
echo "🔬 Installing scipy and scikit-learn..."
pip install --no-cache-dir scipy==1.13.1
pip install --no-cache-dir scikit-learn==1.4.2

# Install other essentials
echo ""
echo "📚 Installing other essentials..."
pip install --no-cache-dir fastapi uvicorn python-multipart aiohttp
pip install --no-cache-dir opencv-python-headless Pillow ffmpeg-python
pip install --no-cache-dir nltk spacy pandas tqdm
pip install --no-cache-dir sentence-transformers faiss-cpu networkx
pip install --no-cache-dir requests pyyaml

# Install spaCy model
echo ""
print_status "Downloading spaCy model..."
python -m spacy download en_core_web_sm

# Install whisperx (this should work now)
echo ""
print_warning "Installing whisperx..."
pip install --no-cache-dir whisperx

# Install pyannote.audio
echo ""
print_warning "Installing pyannote.audio..."
pip install --no-cache-dir --no-build-isolation pyannote.audio==3.1.1

# Test installation
echo ""
echo "🧪 Testing installation..."
python -c "
try:
    import torch
    print('✅ PyTorch:', torch.__version__)
except ImportError as e:
    print('❌ PyTorch failed:', e)

try:
    import faster_whisper
    print('✅ Faster-Whisper installed')
except ImportError as e:
    print('❌ Faster-Whisper failed:', e)

try:
    import whisperx
    print('✅ WhisperX installed')
except ImportError as e:
    print('❌ WhisperX failed:', e)

try:
    import pyannote.audio
    print('✅ Pyannote.audio installed')
except ImportError as e:
    print('❌ Pyannote.audio failed:', e)

try:
    import scipy
    print('✅ SciPy:', scipy.__version__)
except ImportError as e:
    print('❌ SciPy failed:', e)

try:
    import sklearn
    print('✅ Scikit-learn:', sklearn.__version__)
except ImportError as e:
    print('❌ Scikit-learn failed:', e)
"

echo ""
print_status "Dependency fix completed!"
echo ""
echo "🚀 Try starting the backend now:"
echo "   python start_dev.py"
