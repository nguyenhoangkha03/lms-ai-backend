#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}
NAMESPACE=${ENVIRONMENT}

echo "🔐 Deploying secrets to $ENVIRONMENT environment..."

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Database credentials
kubectl create secret generic database-credentials \
  --from-literal=host="$DATABASE_HOST" \
  --from-literal=user="$DATABASE_USER" \
  --from-literal=password="$DATABASE_PASSWORD" \
  --from-literal=name="$DATABASE_NAME" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Application secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=openai-api-key="$OPENAI_API_KEY" \
  --from-literal=sendgrid-api-key="$SENDGRID_API_KEY" \
  --from-literal=sentry-dsn="$SENTRY_DSN" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Redis credentials
kubectl create secret generic redis-credentials \
  --from-literal=host="$REDIS_HOST" \
  --from-literal=password="$REDIS_PASSWORD" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secrets deployed successfully to $ENVIRONMENT!"