#!/bin/bash

set -e

VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"production"}
ROLLBACK_ON_FAILURE=${3:-"true"}

echo "🚀 Starting production deployment..."
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Rollback on failure: $ROLLBACK_ON_FAILURE"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    source ".env.$ENVIRONMENT"
else
    echo "❌ Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if environment is ready
./scripts/health-check.sh || {
    echo "❌ Environment health check failed"
    exit 1
}

# Validate environment variables
echo "🔧 Validating environment variables..."
node -e "
const { EnvironmentValidatorService } = require('./dist/config/environment-validator.service');
const validator = new EnvironmentValidatorService();
validator.validateProductionEnvironment().catch(err => {
    console.error('Environment validation failed:', err.message);
    process.exit(1);
});
"

# Create rollback plan
echo "📋 Creating rollback plan..."
ROLLBACK_PLAN_ID=$(date +%s)
node -e "
const { RollbackService } = require('./dist/deployment/rollback.service');
const rollback = new RollbackService();
rollback.createRollbackPlan('$VERSION').then(() => {
    console.log('Rollback plan created successfully');
}).catch(err => {
    console.error('Failed to create rollback plan:', err.message);
    process.exit(1);
});
"

# Database migrations
echo "🗄️ Running database migrations..."
npm run migration:run || {
    echo "❌ Database migration failed"
    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
        echo "🔄 Rolling back due to migration failure..."
        ./scripts/rollback.sh
    fi
    exit 1
}

# Deploy application
echo "🚢 Deploying application..."
if command -v kubectl &> /dev/null; then
    # Kubernetes deployment
    kubectl set image deployment/lms-ai-backend lms-ai-backend=ghcr.io/your-org/lms-ai-backend:$VERSION -n $ENVIRONMENT
    kubectl rollout status deployment/lms-ai-backend -n $ENVIRONMENT --timeout=300s || {
        echo "❌ Kubernetes deployment failed"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            echo "🔄 Rolling back Kubernetes deployment..."
            kubectl rollout undo deployment/lms-ai-backend -n $ENVIRONMENT
        fi
        exit 1
    }
elif command -v docker &> /dev/null; then
    # Docker deployment
    docker-compose pull
    docker-compose up -d --no-deps lms-ai-backend || {
        echo "❌ Docker deployment failed"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            echo "🔄 Rolling back Docker deployment..."
            docker-compose up -d --no-deps lms-ai-backend
        fi
        exit 1
    }
else
    # Direct deployment
    npm run start:prod &
    APP_PID=$!
fi

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 30

# Post-deployment validation
echo "✅ Running post-deployment validation..."
./scripts/post-deployment-tests.sh || {
    echo "❌ Post-deployment validation failed"
    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
        echo "🔄 Rolling back due to validation failure..."
        ./scripts/rollback.sh
    fi
    exit 1
}

# Cleanup old versions
echo "🧹 Cleaning up old versions..."
if command -v kubectl &> /dev/null; then
    # Keep last 3 replica sets
    kubectl get replicaset -n $ENVIRONMENT | grep lms-ai-backend | tail -n +4 | awk '{print $1}' | xargs -r kubectl delete replicaset -n $ENVIRONMENT
fi

# Send success notification
echo "📢 Sending deployment notification..."
curl -X POST "${SLACK_WEBHOOK_URL}" \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ LMS AI Backend v${VERSION} deployed successfully to ${ENVIRONMENT}\"}" || true

echo "🎉 Production deployment completed successfully!"
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"