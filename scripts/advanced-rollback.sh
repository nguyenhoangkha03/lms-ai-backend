#!/bin/bash

set -e

TARGET_VERSION=${1}
ENVIRONMENT=${2:-"production"}
FORCE=${3:-"false"}

echo "🔄 Starting advanced rollback process..."
echo "Target version: ${TARGET_VERSION:-"previous"}"
echo "Environment: $ENVIRONMENT"
echo "Force rollback: $FORCE"

# Safety checks
if [ "$ENVIRONMENT" = "production" ] && [ "$FORCE" != "true" ]; then
    echo "⚠️ Production rollback requires confirmation"
    read -p "Are you sure you want to rollback production? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Rollback cancelled"
        exit 1
    fi
fi

# Load environment
if [ -f ".env.$ENVIRONMENT" ]; then
    source ".env.$ENVIRONMENT"
fi

# Get current version
CURRENT_VERSION=$(kubectl get deployment lms-ai-backend -n $ENVIRONMENT -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d':' -f2)
echo "📊 Current version: $CURRENT_VERSION"

# Create emergency backup
echo "💾 Creating emergency backup..."
BACKUP_NAME="emergency-backup-$(date +%s)"
kubectl exec -n $ENVIRONMENT deployment/lms-ai-backend -- node -e "
const { BackupService } = require('./dist/database/services/backup.service');
const backup = new BackupService();
backup.createBackup('$BACKUP_NAME').then(() => {
    console.log('Emergency backup created: $BACKUP_NAME');
}).catch(err => {
    console.error('Failed to create emergency backup:', err.message);
    process.exit(1);
});
"

# Execute rollback
echo "🔄 Executing rollback..."
if [ -n "$TARGET_VERSION" ]; then
    # Rollback to specific version
    kubectl set image deployment/lms-ai-backend lms-ai-backend=ghcr.io/your-org/lms-ai-backend:$TARGET_VERSION -n $ENVIRONMENT
else
    # Rollback to previous version
    kubectl rollout undo deployment/lms-ai-backend -n $ENVIRONMENT
fi

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/lms-ai-backend -n $ENVIRONMENT --timeout=300s

# Get rollback version
ROLLBACK_VERSION=$(kubectl get deployment lms-ai-backend -n $ENVIRONMENT -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d':' -f2)
echo "📊 Rollback version: $ROLLBACK_VERSION"

# Database rollback (if needed)
if [ "$TARGET_VERSION" != "$CURRENT_VERSION" ]; then
    echo "🗄️ Checking if database rollback is needed..."
    kubectl exec -n $ENVIRONMENT deployment/lms-ai-backend -- node -e "
    const { RollbackService } = require('./dist/deployment/rollback.service');
    const rollback = new RollbackService();
    rollback.executeRollback('$TARGET_VERSION').then(success => {
        if (success) {
            console.log('Database rollback completed successfully');
        } else {
            console.error('Database rollback failed');
            process.exit(1);
        }
    }).catch(err => {
        console.error('Database rollback error:', err.message);
        process.exit(1);
    });
    "
fi

# Post-rollback validation
echo "✅ Running post-rollback validation..."
./scripts/health-check.sh || {
    echo "❌ Post-rollback health check failed"
    echo "🚨 Manual intervention required"
    exit 1
}

# Send notification
curl -X POST "${SLACK_WEBHOOK_URL}" \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"🔄 LMS AI Backend rolled back from v${CURRENT_VERSION} to v${ROLLBACK_VERSION} in ${ENVIRONMENT}\"}" || true

echo "✅ Advanced rollback completed successfully!"
echo "Previous version: $CURRENT_VERSION"
echo "Current version: $ROLLBACK_VERSION"
echo "Emergency backup: $BACKUP_NAME"