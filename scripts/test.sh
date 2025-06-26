#!/bin/bash

# Test script
echo "🧪 Running LMS AI Backend Tests..."

# Run linting
echo "📝 Running ESLint..."
npm run lint

# Run tests
echo "🎯 Running unit tests..."
npm run test

# Run test coverage
echo "📊 Running test coverage..."
npm run test:cov

# Run e2e tests
echo "🔄 Running e2e tests..."
npm run test:e2e

echo "✅ All tests completed!"