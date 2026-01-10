import { Router } from 'express';
import { Op } from 'sequelize';
import { AccessLog } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Extract primary domain from a hostname.
 * e.g., "baz.bar.foo.com" -> "foo.com"
 *       "subdomain.example.co.uk" -> "example.co.uk"
 *       "localhost:3128" -> "localhost"
 */
function extractPrimaryDomain(hostname: string): string {
  if (!hostname) return 'unknown';
  
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];
  
  // Handle IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)) {
    return hostWithoutPort;
  }
  
  // Handle localhost
  if (hostWithoutPort === 'localhost') {
    return 'localhost';
  }
  
  // Common multi-part TLDs
  const multiPartTlds = [
    'co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.in',
    'com.au', 'com.br', 'com.cn', 'com.mx', 'com.sg', 'com.tw',
    'org.uk', 'org.au', 'net.au', 'gov.uk', 'ac.uk', 'edu.au'
  ];
  
  const parts = hostWithoutPort.toLowerCase().split('.');
  
  // Check for multi-part TLDs
  for (const tld of multiPartTlds) {
    const tldParts = tld.split('.');
    if (parts.length >= tldParts.length + 1) {
      const hostTld = parts.slice(-tldParts.length).join('.');
      if (hostTld === tld) {
        // Return domain + multi-part TLD
        return parts.slice(-(tldParts.length + 1)).join('.');
      }
    }
  }
  
  // Standard case: return last two parts
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  
  return hostWithoutPort;
}

/**
 * Extract hostname from a URL or CONNECT target
 * Handles:
 * - Full URLs: https://example.com/path
 * - CONNECT targets: example.com:443
 * - Invalid/malformed entries
 */
function extractHostname(url: string): string {
  if (!url) return 'unknown';
  
  // Handle CONNECT-style entries (domain:port)
  if (/^[a-zA-Z0-9.-]+:\d+$/.test(url)) {
    return url.split(':')[0];
  }
  
  // Try to parse as URL
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    // Handle cases like "example.com:443" without protocol
    const match = url.match(/^([a-zA-Z0-9.-]+)(:\d+)?/);
    if (match) {
      return match[1];
    }
    return 'unknown';
  }
}

interface DomainStats {
  domain: string;
  primaryDomain: string;
  requests: number;
  bytes: number;
  hits: number;
  misses: number;
  errors: number;
  avgResponseTime: number;
}

// Get domain statistics aggregated by primary domain
router.get('/', authMiddleware, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get access logs
    const logs = await AccessLog.findAll({
      where: {
        timestamp: { [Op.gte]: since },
      },
      attributes: ['url', 'bytesSent', 'cacheStatus', 'httpStatus', 'responseTime'],
      raw: true,
    });

    // Aggregate by primary domain
    const domainMap = new Map<string, {
      subdomains: Set<string>;
      requests: number;
      bytes: number;
      hits: number;
      misses: number;
      errors: number;
      totalResponseTime: number;
    }>();

    logs.forEach((log: any) => {
      const hostname = extractHostname(log.url);
      const primaryDomain = extractPrimaryDomain(hostname);
      
      const existing = domainMap.get(primaryDomain) || {
        subdomains: new Set<string>(),
        requests: 0,
        bytes: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        totalResponseTime: 0,
      };

      existing.subdomains.add(hostname);
      existing.requests++;
      existing.bytes += Number(log.bytesSent) || 0;
      existing.totalResponseTime += Number(log.responseTime) || 0;
      
      if (log.cacheStatus?.includes('HIT')) {
        existing.hits++;
      } else {
        existing.misses++;
      }
      
      if (log.httpStatus >= 400) {
        existing.errors++;
      }

      domainMap.set(primaryDomain, existing);
    });

    // Convert to array and sort by requests (filter out 'unknown' domain)
    const allDomains = Array.from(domainMap.entries())
      .filter(([domain]) => domain !== 'unknown')
      .map(([domain, stats]) => ({
        domain,
        subdomainCount: stats.subdomains.size,
        subdomains: Array.from(stats.subdomains).slice(0, 10), // Limit subdomains list
        requests: stats.requests,
        bytes: stats.bytes,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.requests > 0 ? Math.round((stats.hits / stats.requests) * 100) : 0,
        errors: stats.errors,
        avgResponseTime: stats.requests > 0 
          ? Math.round(stats.totalResponseTime / stats.requests) 
          : 0,
      }))
      .sort((a, b) => b.requests - a.requests);

    const total = allDomains.length;
    const paginatedDomains = allDomains.slice(offset, offset + limit);

    res.json({
      domains: paginatedDomains,
      total,
      limit,
      offset,
      hours,
    });
  } catch (error) {
    console.error('Domain stats error:', error);
    res.status(500).json({ error: 'Failed to get domain stats' });
  }
});

// Search domains
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = parseInt(req.query.limit as string) || 100;
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get access logs that match the search query
    const logs = await AccessLog.findAll({
      where: {
        timestamp: { [Op.gte]: since },
        url: { [Op.iLike]: `%${query}%` },
      },
      attributes: ['url', 'bytesSent', 'cacheStatus', 'httpStatus', 'responseTime'],
      raw: true,
    });

    // Aggregate by primary domain (same logic as main endpoint)
    const domainMap = new Map<string, {
      subdomains: Set<string>;
      requests: number;
      bytes: number;
      hits: number;
      misses: number;
      errors: number;
      totalResponseTime: number;
    }>();

    logs.forEach((log: any) => {
      const hostname = extractHostname(log.url);
      const primaryDomain = extractPrimaryDomain(hostname);
      
      const existing = domainMap.get(primaryDomain) || {
        subdomains: new Set<string>(),
        requests: 0,
        bytes: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        totalResponseTime: 0,
      };

      existing.subdomains.add(hostname);
      existing.requests++;
      existing.bytes += Number(log.bytesSent) || 0;
      existing.totalResponseTime += Number(log.responseTime) || 0;
      
      if (log.cacheStatus?.includes('HIT')) {
        existing.hits++;
      } else {
        existing.misses++;
      }
      
      if (log.httpStatus >= 400) {
        existing.errors++;
      }

      domainMap.set(primaryDomain, existing);
    });

    // Convert to array and sort (filter out 'unknown' domain)
    const domains = Array.from(domainMap.entries())
      .filter(([domain]) => domain !== 'unknown')
      .map(([domain, stats]) => ({
        domain,
        subdomainCount: stats.subdomains.size,
        subdomains: Array.from(stats.subdomains).slice(0, 10),
        requests: stats.requests,
        bytes: stats.bytes,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.requests > 0 ? Math.round((stats.hits / stats.requests) * 100) : 0,
        errors: stats.errors,
        avgResponseTime: stats.requests > 0 
          ? Math.round(stats.totalResponseTime / stats.requests) 
          : 0,
      }))
      .filter(d => d.domain.includes(query.toLowerCase()))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);

    res.json({
      domains,
      total: domains.length,
      query,
      hours,
    });
  } catch (error) {
    console.error('Domain search error:', error);
    res.status(500).json({ error: 'Failed to search domains' });
  }
});

// Get detailed stats for a specific domain
router.get('/:domain', authMiddleware, async (req, res) => {
  try {
    const { domain } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get all logs for this domain
    const logs = await AccessLog.findAll({
      where: {
        timestamp: { [Op.gte]: since },
        url: { [Op.iLike]: `%${domain}%` },
      },
      attributes: ['url', 'method', 'bytesSent', 'cacheStatus', 'httpStatus', 'responseTime', 'mimeType', 'timestamp'],
      order: [['timestamp', 'DESC']],
      raw: true,
    });

    // Filter logs that actually belong to this primary domain
    const domainLogs = logs.filter((log: any) => {
      const hostname = extractHostname(log.url);
      const primaryDomain = extractPrimaryDomain(hostname);
      return primaryDomain === domain;
    });

    // Aggregate subdomains
    const subdomainMap = new Map<string, {
      requests: number;
      bytes: number;
      hits: number;
      errors: number;
    }>();

    // Aggregate by content type
    const contentTypeMap = new Map<string, {
      requests: number;
      bytes: number;
      hits: number;
    }>();

    // Aggregate by hour for chart
    const hourlyMap = new Map<string, {
      requests: number;
      bytes: number;
      hits: number;
    }>();

    let totalRequests = 0;
    let totalBytes = 0;
    let totalHits = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;

    domainLogs.forEach((log: any) => {
      const hostname = extractHostname(log.url);
      totalRequests++;
      totalBytes += Number(log.bytesSent) || 0;
      totalResponseTime += Number(log.responseTime) || 0;
      
      const isHit = log.cacheStatus?.includes('HIT');
      if (isHit) totalHits++;
      if (log.httpStatus >= 400) totalErrors++;

      // Subdomain stats
      const subStats = subdomainMap.get(hostname) || { requests: 0, bytes: 0, hits: 0, errors: 0 };
      subStats.requests++;
      subStats.bytes += Number(log.bytesSent) || 0;
      if (isHit) subStats.hits++;
      if (log.httpStatus >= 400) subStats.errors++;
      subdomainMap.set(hostname, subStats);

      // Content type stats
      const mimeType = log.mimeType || 'unknown';
      const contentType = mimeType.split('/')[0] || 'unknown';
      const ctStats = contentTypeMap.get(contentType) || { requests: 0, bytes: 0, hits: 0 };
      ctStats.requests++;
      ctStats.bytes += Number(log.bytesSent) || 0;
      if (isHit) ctStats.hits++;
      contentTypeMap.set(contentType, ctStats);

      // Hourly stats
      const hourKey = new Date(log.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      const hourStats = hourlyMap.get(hourKey) || { requests: 0, bytes: 0, hits: 0 };
      hourStats.requests++;
      hourStats.bytes += Number(log.bytesSent) || 0;
      if (isHit) hourStats.hits++;
      hourlyMap.set(hourKey, hourStats);
    });

    // Format subdomain stats
    const subdomains = Array.from(subdomainMap.entries())
      .map(([subdomain, stats]) => ({
        subdomain,
        requests: stats.requests,
        bytes: stats.bytes,
        hitRate: stats.requests > 0 ? Math.round((stats.hits / stats.requests) * 100) : 0,
        errors: stats.errors,
      }))
      .sort((a, b) => b.requests - a.requests);

    // Format content type stats
    const contentTypes = Array.from(contentTypeMap.entries())
      .map(([type, stats]) => ({
        type,
        requests: stats.requests,
        bytes: stats.bytes,
        hitRate: stats.requests > 0 ? Math.round((stats.hits / stats.requests) * 100) : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    // Format hourly stats
    const hourlyStats = Array.from(hourlyMap.entries())
      .map(([timestamp, stats]) => ({
        timestamp,
        requests: stats.requests,
        bytes: stats.bytes,
        hitRate: stats.requests > 0 ? Math.round((stats.hits / stats.requests) * 100) : 0,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    res.json({
      domain,
      hours,
      summary: {
        totalRequests,
        totalBytes,
        hitRate: totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) : 0,
        errors: totalErrors,
        avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
      },
      subdomains,
      contentTypes,
      hourlyStats,
    });
  } catch (error) {
    console.error('Domain detail error:', error);
    res.status(500).json({ error: 'Failed to get domain details' });
  }
});

export default router;
