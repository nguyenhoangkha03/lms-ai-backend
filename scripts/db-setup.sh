#!/bin/bash

# Database setup script
echo "🗄️ Setting up LMS AI Database..."

# Load environment variables
source .env

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
while ! mysqladmin ping -h"$DATABASE_HOST" -P"$DATABASE_PORT" --silent; do
    sleep 1
done

echo "✅ MySQL is ready!"

# Run migrations
echo "🔄 Running database migrations..."
npm run migration:run

# Run seeds
echo "🌱 Running database seeds..."
npm run seed

echo "✅ Database setup completed!"