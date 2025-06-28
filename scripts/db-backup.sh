#!/bin/bash

# Database backup script
echo "💾 Creating Database Backup..."

# Load environment variables
source .env

# Create backup directory
mkdir -p ./backups

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="./backups/lms-ai-backup-${TIMESTAMP}.sql"

# Create backup
mysqldump \
  -h"$DATABASE_HOST" \
  -P"$DATABASE_PORT" \
  -u"$DATABASE_USERNAME" \
  -p"$DATABASE_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  "$DATABASE_NAME" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"