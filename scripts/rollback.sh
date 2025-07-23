#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2}

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <environment> <version>"
  echo "Example: $0 production v1.2.3"
  exit 1
fi

echo "🔄 Rolling back $ENVIRONMENT to version $VERSION..."

# Rollback Kubernetes deployment
kubectl rollout undo deployment/lms-ai-backend -n $ENVIRONMENT --to-revision=$VERSION

# Wait for rollout to complete
kubectl rollout status deployment/lms-ai-backend -n $ENVIRONMENT

# Run health checks
echo "Running post-rollback health checks..."
./scripts/health-check.sh

# Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"🔄 LMS AI Backend rolled back to $VERSION in $ENVIRONMENT\"}"

echo "✅ Rollback completed successfully!"