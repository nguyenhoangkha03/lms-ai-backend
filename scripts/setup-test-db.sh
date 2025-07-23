#!/bin/bash

set -e

echo "🗄️ Setting up test database..."

# Wait for MySQL to be ready
until mysqladmin ping -h"$DATABASE_HOST" -P"$DATABASE_PORT" -u"$DATABASE_USER" -p"$DATABASE_PASSWORD" --silent; do
  echo "Waiting for MySQL..."
  sleep 2
done

# Create test database
mysql -h"$DATABASE_HOST" -P"$DATABASE_PORT" -u"$DATABASE_USER" -p"$DATABASE_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}_test;"

# Run migrations
NODE_ENV=test npm run migration:run

# Seed test data
NODE_ENV=test npm run seed:test

echo "✅ Test database setup complete!"