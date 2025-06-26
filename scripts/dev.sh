#!/bin/bash

# Development startup script
echo "🚀 Starting LMS AI Backend Development Environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run migrations (will be added in next parts)
echo "🗄️  Running database migrations..."
# npm run migration:run

# Start the application
echo "🎯 Starting NestJS application..."
npm run start:dev