# Squache - Intelligent Caching Proxy

Squache (Squid + Cache) is an intelligent caching proxy service designed for web scraping operations. It provides SSL bumping capabilities with a self-signed CA, upstream proxy routing (VPN, residential proxies), and a web-based management interface for monitoring and configuration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Squache System                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   Frontend   │────▶│   Backend    │────▶│         Squid Proxy          │ │
│  │  (Next.js)   │     │  (Express)   │     │  (SSL Bumping + Caching)     │ │
│  │  Port 3011   │     │  Port 3010   │     │       Port 3128              │ │
│  └──────────────┘     └──────────────┘     └──────────────────────────────┘ │
│         │                    │                         │                    │
│         │                    │                         │                    │
│         │                    ▼                         ▼                    │
│         │            ┌──────────────┐          ┌──────────────┐            │
│         │            │  PostgreSQL  │          │  Upstream    │            │
│         └───────────▶│   Database   │          │  Proxies     │            │
│                      └──────────────┘          │  (VPN/Resi)  │            │
│                                                └──────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

### Core Caching
- **SSL Bumping**: Intercepts and caches HTTPS traffic using a self-signed CA
- **Aggressive Caching**: Caches large files (images, video, JS, CSS, fonts)
- **Configurable Rules**: Define caching rules per domain or content type
- **Cache Statistics**: Real-time bandwidth savings and hit/miss ratios

### Upstream Proxy Routing
- **VPN Integration**: Route traffic through VPN servers (PIA, etc.)
- **Residential Proxies**: Support for metered residential proxy connections
- **Geographic Selection**: Choose specific countries/cities for requests
- **Dynamic Routing**: Pass proxy options via request metadata

### Management Interface
- **Dashboard**: Real-time bandwidth metrics and cache statistics
- **Log Viewer**: Browse and search access logs
- **Cache Control**: Purge cache, view cached objects
- **Configuration**: Manage caching rules and upstream proxies

## URL-Based Proxy Selection

Squache supports passing proxy options via URL metadata. When making requests through the proxy, you can specify upstream proxy preferences:

```javascript
// Example: Using Puppeteer with Squache
const browser = await puppeteer.launch({
  args: [
    '--proxy-server=http://squache-proxy:3128',
  ]
});

// Set custom headers to control routing
await page.setExtraHTTPHeaders({
  'X-Squache-Upstream': 'residential',
  'X-Squache-Country': 'US',
  'X-Squache-City': 'new-york'
});
```

### Upstream Options

| Header | Values | Description |
|--------|--------|-------------|
| `X-Squache-Upstream` | `direct`, `vpn`, `residential` | Proxy type to use |
| `X-Squache-Country` | ISO country code | Target country |
| `X-Squache-City` | City name | Target city (if available) |
| `X-Squache-Provider` | Provider name | Specific proxy provider |

## API Endpoints

### Statistics
- `GET /api/stats` - Overall cache statistics
- `GET /api/stats/bandwidth` - Bandwidth usage over time
- `GET /api/stats/domains` - Per-domain statistics

### Cache Management
- `GET /api/cache` - List cached objects
- `DELETE /api/cache` - Purge all cache
- `DELETE /api/cache/:pattern` - Purge cache by URL pattern

### Logs
- `GET /api/logs` - Recent access logs
- `GET /api/logs/search` - Search logs

### Configuration
- `GET /api/config` - Current configuration
- `PUT /api/config` - Update configuration
- `GET /api/upstreams` - List upstream proxies
- `POST /api/upstreams` - Add upstream proxy
- `DELETE /api/upstreams/:id` - Remove upstream proxy

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info

## Environment Variables

### Backend (`squache-backend.env`)

```env
# Database
DATABASE_URL=postgres://devrupt:password@postgres:5432/squache

# Server
PORT=3010
NODE_ENV=development
JWT_SECRET=your-jwt-secret

# URLs
BACKEND_URL=http://localhost:3010
FRONTEND_URL=http://localhost:3011
CORS_ORIGIN=http://localhost:3011

# Admin credentials (auto-created on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASS=secure-password-here

# Squid Configuration
SQUID_LOG_PATH=/var/log/squid/access.log
SQUID_CACHE_DIR=/var/spool/squid

# Upstream Proxies (JSON array)
# Format: [{"name": "pia-us", "type": "vpn", "host": "...", "port": ...}]
UPSTREAM_PROXIES=[]
```

### Frontend (`squache-frontend.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3010
NEXT_PUBLIC_SITE_URL=http://localhost:3011
API_URL_INTERNAL=http://squache-backend:3010
```

## SSL Bumping Setup

Squache uses a self-signed CA certificate for SSL bumping. This allows it to intercept and cache HTTPS traffic.

### Generate CA Certificate

```bash
# Generate CA key and certificate
openssl req -new -newkey rsa:2048 -sha256 -days 3650 -nodes -x509 \
  -extensions v3_ca -keyout data/squache/ssl/squid-ca.key \
  -out data/squache/ssl/squid-ca.crt \
  -subj "/C=US/ST=State/L=City/O=Squache/CN=SquacheCA"

# Generate DH parameters for Squid
openssl dhparam -out data/squache/ssl/dhparam.pem 2048
```

### Trust the CA in Client Applications

For Puppeteer/Chrome to trust the SSL-bumped connections:

```javascript
const browser = await puppeteer.launch({
  args: [
    '--proxy-server=http://squache-proxy:3128',
    '--ignore-certificate-errors', // Or install CA cert
  ]
});
```

Or install the CA certificate in the system trust store.

## Squid Configuration

The Squid proxy is configured with:

- **Cache Size**: 10GB disk cache + 512MB memory cache
- **Max Object Size**: 1GB (for large videos/images)
- **Refresh Patterns**: Aggressive caching for static assets
- **SSL Bump**: Full interception for HTTPS traffic
- **Access Logging**: Detailed logs for analytics

Key configuration files:
- `proxy/squid.conf` - Main Squid configuration
- `proxy/refresh_patterns.conf` - Cache refresh rules
- `proxy/ssl_bump.conf` - SSL bumping rules

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `squache-proxy` | 3128 | Squid caching proxy |
| `squache-backend` | 3010 | Express API server |
| `squache-frontend` | 3011 | Next.js web interface |

## Usage from Other Projects

### Puppeteer Example

```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  args: [
    '--proxy-server=http://squache-proxy:3128',
    // Trust the Squache CA certificate
    '--ignore-certificate-errors-spki-list=<SPKI hash>',
  ],
  env: {
    ...process.env,
    // Set CA cert path for Node.js
    NODE_EXTRA_CA_CERTS: '/path/to/squid-ca.crt',
  }
});

const page = await browser.newPage();

// Optional: Set upstream proxy preferences
await page.setExtraHTTPHeaders({
  'X-Squache-Upstream': 'vpn',
  'X-Squache-Country': 'US',
});

await page.goto('https://example.com');
```

### Environment Variable

Other services can use the proxy by setting:

```env
SQUACHE_PROXY_URL=http://squache-proxy:3128
```

## Development

```bash
# Start all squache services
docker compose up squache-proxy squache-backend squache-frontend

# View Squid logs
docker compose logs -f squache-proxy

# Access the management interface
open http://localhost:3011
```

## Production Deployment

1. Generate production CA certificates
2. Update environment files with production URLs
3. Configure upstream proxies (VPN, residential)
4. Set strong `ADMIN_PASS` and `JWT_SECRET`

## Bandwidth Savings

Squache provides significant bandwidth savings for web scraping operations:

- **Static Assets**: 90%+ cache hit rate for JS/CSS/images
- **Repeated Crawls**: Dramatically reduced bandwidth on re-crawls
- **Residential Proxies**: Minimize expensive metered connections

## Logging

Access logs are parsed and stored in PostgreSQL for analysis:

- Request timestamp
- Source IP
- URL
- HTTP method and status
- Bytes sent/received
- Cache hit/miss status
- Response time
- Upstream proxy used

## License

Private - DEVRUPT.IO LLC
