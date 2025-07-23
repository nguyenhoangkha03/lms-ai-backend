#!/bin/bash

set -e

API_URL=${API_URL:-"http://localhost:3000"}
DURATION=${DURATION:-"30s"}
CONCURRENCY=${CONCURRENCY:-"10"}

echo "🚀 Running performance tests against $API_URL"

# Install k6 if not present
if ! command -v k6 &> /dev/null; then
  echo "Installing k6..."
  curl -s https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
  sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
fi

# Run performance tests
k6 run --duration=$DURATION --vus=$CONCURRENCY performance-tests/api-load-test.js

echo "✅ Performance tests completed!"