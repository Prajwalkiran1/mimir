#!/bin/bash

# Simple installation script that works
set -e

echo "🔧 Simple Mimir Backend Installation"
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

# Install core dependencies first
echo ""
echo "🔥 Installing PyTorch..."
pip install torch torchvision torchaudio

echo ""
echo "🤖 Installing Transformers..."
pip install transformers tokenizers

echo ""
echo "🔬 Installing NumPy and SciPy..."
pip install numpy==1.26.4 scipy==1.13.1

echo ""
echo "📊 Installing Scikit-learn..."
pip install scikit-learn==1.4.2

echo ""
echo "🎵 Installing Audio Processing..."
pip install "faster-whisper>=1.1.1"
pip install whisperx
pip install pyannote.audio==3.1.1

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
packages = ['torch', 'transformers', 'numpy', 'scipy', 'sklearn', 'faster_whisper', 'whisperx', 'pyannote.audio', 'spacy', 'nltk', 'sentence_transformers', 'fastapi']
failed = []
for pkg in packages:
    try:
        if pkg == 'faster_whisper':
            import faster_whisper
        elif pkg == 'sentence_transformers':
            import sentence_transformers
        elif pkg == 'pyannote.audio':
            import pyannote.audio
        else:
            __import__(pkg)
        print(f'✅ {pkg}')
    except ImportError as e:
        print(f'❌ {pkg}: {e}')
        failed.append(pkg)

if failed:
    print(f'\\n❌ Failed packages: {failed}')
    sys.exit(1)
else:
    print('\\n✅ All packages installed successfully!')
"

echo ""
print_status "Installation completed!"
echo ""
echo "🚀 Start the backend with:"
echo "   source venv/bin/activate"
echo "   python start_dev.py"
