#!/bin/bash

# SSL Certificate Generation Script for Development
echo "🔐 Generating SSL certificates for development..."

# Create SSL directory
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/private.key 2048

# Generate certificate signing request
openssl req -new -key ssl/private.key -out ssl/certificate.csr -subj "/C=VN/ST=SocTrang/L=SocTrang/O=LMS AI/OU=Development/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -in ssl/certificate.csr -signkey ssl/private.key -out ssl/certificate.crt -days 365

# Generate CA bundle (optional for development)
cp ssl/certificate.crt ssl/ca-bundle.crt

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates location: ./ssl/"
echo "⚠️ Note: These are self-signed certificates for development only"
echo "🔥 For production, use certificates from a trusted CA"

# Set proper permissions
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
chmod 644 ssl/ca-bundle.crt

echo "🔒 Certificate permissions set correctly"