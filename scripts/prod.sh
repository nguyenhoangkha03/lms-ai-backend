#!/bin/bash

# Production startup script
echo "🚀 Starting LMS AI Backend Production Environment..."

# Build the application
echo "🔨 Building application..."
npm run build

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo "✅ Production environment started successfully!"