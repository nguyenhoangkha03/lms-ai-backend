#!/bin/bash

set -e

API_URL=${API_URL:-"http://localhost:3000"}

echo "🔍 Running smoke tests against $API_URL"

# Health check
echo "Testing health endpoint..."
curl -f "$API_URL/health" || exit 1

# API version check
echo "Testing API version..."
curl -f "$API_URL/api/v1" || exit 1

# Authentication endpoint
echo "Testing auth endpoint..."
curl -f -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"invalid"}' || exit 1

echo "✅ Smoke tests passed!"