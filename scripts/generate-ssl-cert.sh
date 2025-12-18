#!/bin/bash
# Generate SSL CA certificate for Squid SSL bumping
# Run this script once before starting the squache-proxy container

set -e

SSL_DIR="./data/squache/ssl"

# Create directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Check if certificate already exists
if [ -f "$SSL_DIR/squid-ca.crt" ] && [ -f "$SSL_DIR/squid-ca.key" ]; then
    echo "SSL certificates already exist in $SSL_DIR"
    echo "To regenerate, delete the existing files and run this script again."
    exit 0
fi

echo "Generating Squache CA certificate..."

# Generate CA private key and certificate
openssl req -new -newkey rsa:2048 -sha256 -days 3650 -nodes -x509 \
    -extensions v3_ca \
    -keyout "$SSL_DIR/squid-ca.key" \
    -out "$SSL_DIR/squid-ca.crt" \
    -subj "/C=US/ST=State/L=City/O=Squache/CN=SquacheCA"

# Generate DH parameters for Squid
echo "Generating DH parameters (this may take a while)..."
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

# Set permissions
chmod 600 "$SSL_DIR/squid-ca.key"
chmod 644 "$SSL_DIR/squid-ca.crt"
chmod 644 "$SSL_DIR/dhparam.pem"

echo ""
echo "SSL certificates generated successfully!"
echo ""
echo "Files created:"
echo "  - $SSL_DIR/squid-ca.crt (CA certificate)"
echo "  - $SSL_DIR/squid-ca.key (CA private key)"
echo "  - $SSL_DIR/dhparam.pem (DH parameters)"
echo ""
echo "To trust SSL-bumped connections in your applications, either:"
echo "  1. Add the CA certificate to your system trust store"
echo "  2. Use --ignore-certificate-errors in Chrome/Puppeteer"
echo "  3. Set NODE_EXTRA_CA_CERTS=$SSL_DIR/squid-ca.crt for Node.js"
echo ""
