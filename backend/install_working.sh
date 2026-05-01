#!/bin/bash

# Working installation script with compatible versions
set -e

echo "🔧 Working Mimir Backend Installation"
echo "===================================="

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

# Create fresh virtual environment
echo ""
echo "🐍 Creating fresh virtual environment..."
rm -rf venv
python3 -m venv venv
source venv/bin/activate
print_status "Virtual environment created"

# Upgrade pip
echo ""
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install compatible NumPy version first
echo ""
echo "🔬 Installing compatible NumPy..."
pip install "numpy<2.0"  # Use NumPy 1.x for compatibility

# Install core dependencies
echo ""
echo "🔥 Installing PyTorch..."
pip install torch torchvision torchaudio

echo ""
echo "🤖 Installing Transformers..."
pip install transformers==4.40.2 tokenizers==0.19.1

echo ""
echo "🔬 Installing SciPy and Scikit-learn..."
pip install scipy==1.13.1 scikit-learn==1.4.2

echo ""
echo "🎵 Installing Audio Processing (compatible versions)..."
pip install "faster-whisper>=1.1.1"

# Install whisperx with compatible pyannote.audio
echo ""
print_warning "Installing whisperx with compatible pyannote.audio..."
pip install "pyannote.audio>=4.0.0"  # Use newer version compatible with NumPy 2.0
pip install whisperx

echo ""
echo "🎬 Installing Video Processing..."
pip install opencv-python-headless Pillow ffmpeg-python

echo ""
echo "🧠 Installing NLP..."
pip install spacy
python -m spacy download en_core_web_sm

echo ""
echo "📝 Installing Text Processing..."
pip install nltk pandas tqdm

echo ""
echo "🔍 Installing Vector Store..."
pip install sentence-transformers faiss-cpu

echo ""
echo "🌐 Installing Web Framework..."
pip install fastapi uvicorn python-multipart aiohttp

echo ""
echo "🔧 Installing Utilities..."
pip install requests pyyaml networkx

echo ""
echo "📚 Installing remaining packages..."
pip install stable-ts accelerate datasets redis celery

# Test installation
echo ""
echo "🧪 Testing installation..."
python -c "
import sys
print('Testing key packages...')
try:
    import torch
    print('✅ torch:', torch.__version__)
except Exception as e:
    print('❌ torch:', e)

try:
    import transformers
    print('✅ transformers:', transformers.__version__)
except Exception as e:
    print('❌ transformers:', e)

try:
    import numpy as np
    print('✅ numpy:', np.__version__)
except Exception as e:
    print('❌ numpy:', e)

try:
    import faster_whisper
    print('✅ faster_whisper installed')
except Exception as e:
    print('❌ faster_whisper:', e)

try:
    import whisperx
    print('✅ whisperx installed')
except Exception as e:
    print('❌ whisperx:', e)

try:
    import pyannote.audio
    print('✅ pyannote.audio installed')
except Exception as e:
    print('❌ pyannote.audio:', e)

try:
    import fastapi
    print('✅ fastapi:', fastapi.__version__)
except Exception as e:
    print('❌ fastapi:', e)

print('\\n✅ Core packages tested successfully!')
"

echo ""
print_status "Installation completed!"
echo ""
echo "🚀 Start the backend with:"
echo "   source venv/bin/activate"
echo "   python start_dev.py"
