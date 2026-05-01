#!/bin/bash

# Start the Mimir Video Processing API server

echo "Starting Mimir Video Processing API..."

# Activate virtual environment
source venv/bin/activate

# Start the server
echo "Server starting on http://0.0.0.0:8000"
echo "API Documentation available at: http://0.0.0.0:8000/docs"
echo "Authentication endpoints:"
echo "  - Register: POST /api/v1/auth/register"
echo "  - Login: POST /api/v1/auth/login"
echo "  - Profile: GET /api/v1/auth/me"
echo ""
echo "Video processing endpoints:"
echo "  - Upload: POST /api/v1/upload"
echo "  - Status: GET /api/v1/status/{task_id}"
echo "  - Results: GET /api/v1/results/{task_id}"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
