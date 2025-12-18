FROM ubuntu:22.04

# Install Squid and OpenSSL
RUN apt-get update && apt-get install -y \
    squid-openssl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create squid user if it doesn't exist (some versions don't create it automatically)
RUN id -u proxy &>/dev/null || useradd -r -s /usr/sbin/nologin proxy

# Create directories
RUN mkdir -p /etc/squid/ssl \
    /etc/squid/conf.d \
    /etc/squid/conf.d.default \
    /var/lib/squid/ssl_db \
    /var/spool/squid \
    /var/log/squid

# Copy configuration
COPY squid.conf /etc/squid/squid.conf
COPY conf.d/ /etc/squid/conf.d.default/
COPY entrypoint.sh /entrypoint.sh

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

# Set permissions (use 'proxy' user which squid runs as on Ubuntu)
RUN chown -R proxy:proxy /var/lib/squid /var/spool/squid /var/log/squid /etc/squid/conf.d

# SSL certificates will be mounted at runtime
# /etc/squid/ssl/squid-ca.crt
# /etc/squid/ssl/squid-ca.key

EXPOSE 3128

ENTRYPOINT ["/entrypoint.sh"]
