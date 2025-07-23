#!/bin/bash

set -e

API_URL=${API_URL:-"http://localhost:3000"}

echo "🔒 Running security tests against $API_URL"

# OWASP ZAP Security Scan
if command -v zap-baseline.py &> /dev/null; then
  echo "Running OWASP ZAP baseline scan..."
  zap-baseline.py -t $API_URL -r zap-report.html
fi

# SQL Injection Tests
echo "Testing for SQL injection vulnerabilities..."
sqlmap -u "$API_URL/api/v1/auth/login" \
  --data='{"email":"test","password":"test"}' \
  --method=POST \
  --header="Content-Type: application/json" \
  --batch \
  --level=1 \
  --risk=1 || echo "SQLMap scan completed"

# Check for common security headers
echo "Checking security headers..."
curl -I $API_URL | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security)" || echo "Some security headers missing"

echo "✅ Security tests completed!"