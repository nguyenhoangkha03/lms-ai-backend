#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}

echo "🗄️ Running database migrations for $ENVIRONMENT environment..."

# Backup database before migration
if [ "$ENVIRONMENT" = "production" ]; then
  echo "Creating production database backup..."
  ./scripts/db-backup.sh production
fi

# Run migrations
echo "Running migrations..."
NODE_ENV=$ENVIRONMENT npm run migration:run

# Verify migration success
echo "Verifying migrations..."
NODE_ENV=$ENVIRONMENT npm run migration:show

echo "✅ Database migrations completed successfully!"