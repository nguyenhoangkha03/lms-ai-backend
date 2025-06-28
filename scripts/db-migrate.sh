#!/bin/bash

# Database migration script
echo "🔄 Running Database Migrations..."

# Check if migration name is provided
if [ -z "$1" ]; then
    echo "📝 Running all pending migrations..."
    npm run migration:run
else
    echo "📝 Generating new migration: $1"
    npm run migration:generate -- src/database/migrations/$1
fi

echo "✅ Migration operations completed!"