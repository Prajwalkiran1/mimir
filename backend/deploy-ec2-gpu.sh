#!/bin/bash

# EC2 GPU Deployment Script for Mimir Backend
# This script sets up the backend on an EC2 instance with GPU support

set -e

echo "🚀 Starting Mimir Backend Deployment on EC2 GPU..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker and Docker Compose
echo "🐳 Installing Docker and Docker Compose..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install NVIDIA Container Toolkit
echo "🎮 Installing NVIDIA Container Toolkit..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/mimir-backend
sudo chown $USER:$USER /opt/mimir-backend
cd /opt/mimir-backend

# Clone or copy the backend code
echo "📋 Setting up backend code..."
# If you're using git, uncomment the following lines:
# git clone <your-repo-url> .
# Otherwise, copy your files here

# Create necessary directories
mkdir -p uploads models logs

# Set environment variables
echo "🔧 Setting up environment variables..."
cat > .env << EOF
# GPU Configuration
CUDA_VISIBLE_DEVICES=0
PYTHONPATH=/app

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Redis Configuration
REDIS_URL=redis://redis:6379

# File Upload Configuration
MAX_FILE_SIZE=500MB
UPLOAD_DIR=/app/uploads

# Model Configuration
MODEL_CACHE_DIR=/app/models
WHISPER_MODEL=base
TRANSFORMERS_CACHE=/app/models

# Security
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://your-domain.com
EOF

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:8000/health; then
    echo "✅ Backend is healthy and ready!"
else
    echo "❌ Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Display status
echo "📊 Service Status:"
docker-compose ps

echo "🎉 Deployment completed successfully!"
echo "📝 Important URLs:"
echo "   - API Health: http://$(curl -s ifconfig.me):8000/health"
echo "   - API Docs: http://$(curl -s ifconfig.me):8000/docs"
echo "   - API Root: http://$(curl -s ifconfig.me):8000/"

echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f backend"
echo "   - Restart services: docker-compose restart"
echo "   - Stop services: docker-compose down"
echo "   - Check GPU usage: nvidia-smi"

# Setup log rotation
echo "📋 Setting up log rotation..."
sudo tee /etc/logrotate.d/mimir-backend << EOF
/opt/mimir-backend/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

echo "✅ Setup complete! Your Mimir backend is running on EC2 GPU."
