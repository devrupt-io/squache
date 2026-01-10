#!/bin/bash
# Squache Proxy Entrypoint Script

set -e

# On Ubuntu, Squid runs as 'proxy' user, not 'squid'
SQUID_USER="proxy"

# Generate SSL CA certificate if it doesn't exist
SSL_DIR="/etc/squid/ssl"
if [ ! -f "$SSL_DIR/squid-ca.crt" ] || [ ! -f "$SSL_DIR/squid-ca.key" ]; then
    echo "=============================================="
    echo "Generating SSL CA certificate for SSL bumping..."
    echo "=============================================="
    mkdir -p "$SSL_DIR"
    openssl req -new -newkey rsa:2048 -sha256 -days 3650 -nodes -x509 \
        -extensions v3_ca \
        -keyout "$SSL_DIR/squid-ca.key" \
        -out "$SSL_DIR/squid-ca.crt" \
        -subj "/C=US/ST=State/L=City/O=Squache/CN=SquacheCA" 2>/dev/null
    chmod 644 "$SSL_DIR/squid-ca.crt"
    chmod 600 "$SSL_DIR/squid-ca.key"
    echo "SSL certificate generated successfully!"
    echo "Download from: http://localhost:3010/api/config/ssl/certificate"
    echo "=============================================="
fi

# Create SSL database if it doesn't exist or is corrupted/empty
# Check for index.txt which is created when db is properly initialized
if [ ! -f /var/lib/squid/ssl_db/index.txt ]; then
    echo "Initializing SSL certificate database..."
    rm -rf /var/lib/squid/ssl_db 2>/dev/null || true
    /usr/lib/squid/security_file_certgen -c -s /var/lib/squid/ssl_db -M 4MB
fi
# Always ensure correct ownership
chown -R $SQUID_USER:$SQUID_USER /var/lib/squid

# Ensure log directory exists and is writable
mkdir -p /var/log/squid
chown -R $SQUID_USER:$SQUID_USER /var/log/squid

# Ensure conf.d directory exists and has required files BEFORE cache init
mkdir -p /etc/squid/conf.d

# Create upstreams.conf if it doesn't exist
if [ ! -f /etc/squid/conf.d/upstreams.conf ]; then
    echo "Creating default upstreams.conf..."
    cp /etc/squid/conf.d.default/upstreams.conf /etc/squid/conf.d/upstreams.conf
fi

# Create default settings.conf if it doesn't exist
if [ ! -f /etc/squid/conf.d/settings.conf ]; then
    echo "Creating default settings.conf..."
    cp /etc/squid/conf.d.default/settings.conf.default /etc/squid/conf.d/settings.conf
fi

chown -R $SQUID_USER:$SQUID_USER /etc/squid/conf.d

# Create cache directory structure if needed (after conf files exist)
if [ ! -d /var/spool/squid/00 ]; then
    echo "Initializing cache directories..."
    squid -z -N
fi

# Start Squid in foreground mode
echo "Starting Squid proxy..."
exec squid -N -f /etc/squid/squid.conf
