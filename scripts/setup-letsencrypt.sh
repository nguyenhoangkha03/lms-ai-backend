#!/bin/bash

set -e

DOMAIN=${1:-"api.lms-ai.com"}
EMAIL=${2:-"admin@lms-ai.com"}
WEBROOT_PATH="/var/www/certbot"

echo "🔐 Setting up Let's Encrypt SSL certificate for $DOMAIN"

# Create webroot directory
mkdir -p $WEBROOT_PATH

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    else
        echo "Please install certbot manually"
        exit 1
    fi
fi

# Generate certificate
echo "Generating SSL certificate..."
sudo certbot certonly \
    --webroot \
    --webroot-path=$WEBROOT_PATH \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Copy certificates to application directory
SSL_DIR="./ssl/production"
mkdir -p $SSL_DIR

sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/private.key
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/certificate.crt
sudo cp /etc/letsencrypt/live/$DOMAIN/chain.pem $SSL_DIR/ca-bundle.crt

# Set proper permissions
sudo chown -R $USER:$USER $SSL_DIR
chmod 600 $SSL_DIR/private.key
chmod 644 $SSL_DIR/certificate.crt
chmod 644 $SSL_DIR/ca-bundle.crt

# Setup automatic renewal
echo "Setting up automatic renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx && pm2 restart all'") | crontab -

echo "✅ SSL certificate setup completed for $DOMAIN"
echo "📁 Certificates location: $SSL_DIR"
echo "🔄 Automatic renewal configured"