#!/bin/bash
# Squache Proxy Entrypoint Script

set -e

# On Ubuntu, Squid runs as 'proxy' user, not 'squid'
SQUID_USER="proxy"

# Create SSL database if it doesn't exist or is corrupted/empty
# Check for index.txt which is created when db is properly initialized
if [ ! -f /var/lib/squid/ssl_db/index.txt ]; then
    echo "Initializing SSL certificate database..."
    rm -rf /var/lib/squid/ssl_db 2>/dev/null || true
    /usr/lib/squid/security_file_certgen -c -s /var/lib/squid/ssl_db -M 4MB
fi
# Always ensure correct ownership
chown -R $SQUID_USER:$SQUID_USER /var/lib/squid

# Create cache directory structure if needed
if [ ! -d /var/spool/squid/00 ]; then
    echo "Initializing cache directories..."
    squid -z -N
fi

# Ensure log directory exists and is writable
mkdir -p /var/log/squid
chown -R $SQUID_USER:$SQUID_USER /var/log/squid

# Ensure conf.d directory exists
mkdir -p /etc/squid/conf.d
touch /etc/squid/conf.d/upstreams.conf
chown -R $SQUID_USER:$SQUID_USER /etc/squid/conf.d

# Start Squid in foreground mode
echo "Starting Squid proxy..."
exec squid -N -f /etc/squid/squid.conf
