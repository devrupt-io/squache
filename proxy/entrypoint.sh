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

# Create default settings.conf if it doesn't exist
if [ ! -f /etc/squid/conf.d/settings.conf ]; then
    echo "Creating default settings.conf..."
    cat > /etc/squid/conf.d/settings.conf << 'EOF'
# Squache Dynamic Settings
# Auto-generated default - will be managed by squache-backend

# Memory cache: 512 MB
cache_mem 512 MB

# Maximum cacheable object size: 1 GB
maximum_object_size 1 GB

maximum_object_size_in_memory 50 MB

# Aggressive caching enabled - override cache headers for static assets
refresh_pattern -i \.(gif|png|jpg|jpeg|ico|webp|svg|bmp|tiff)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private
refresh_pattern -i \.(css|js|jsx|ts|tsx|mjs)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private
refresh_pattern -i \.(woff|woff2|ttf|otf|eot)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private
refresh_pattern -i \.(mp4|webm|avi|mov|mkv|flv|wmv|m4v)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private
refresh_pattern -i \.(mp3|wav|ogg|flac|m4a|aac)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private
refresh_pattern -i \.(pdf|doc|docx|xls|xlsx|ppt|pptx)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private
refresh_pattern -i \.(zip|rar|7z|tar|gz|bz2)$ 10080 90% 43200 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-store ignore-private

# SSL bumping enabled
EOF
fi

chown -R $SQUID_USER:$SQUID_USER /etc/squid/conf.d

# Start Squid in foreground mode
echo "Starting Squid proxy..."
exec squid -N -f /etc/squid/squid.conf
