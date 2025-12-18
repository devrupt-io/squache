import { Router } from 'express';
import { Op } from 'sequelize';
import { AccessLog, CacheStats } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get overall stats
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Get stats from the last 24 hours
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const stats = await CacheStats.findAll({
      where: {
        timestamp: { [Op.gte]: since },
        period: 'minute',
      },
      order: [['timestamp', 'DESC']],
    });

    // Aggregate stats
    const totals = stats.reduce(
      (acc, stat) => ({
        totalRequests: acc.totalRequests + stat.totalRequests,
        cacheHits: acc.cacheHits + stat.cacheHits,
        cacheMisses: acc.cacheMisses + stat.cacheMisses,
        bytesSent: acc.bytesSent + Number(stat.bytesSent),
        bytesFromCache: acc.bytesFromCache + Number(stat.bytesFromCache),
        totalResponseTime: acc.totalResponseTime + stat.avgResponseTime * stat.totalRequests,
      }),
      {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesSent: 0,
        bytesFromCache: 0,
        totalResponseTime: 0,
      }
    );

    const hitRate = totals.totalRequests > 0 
      ? (totals.cacheHits / totals.totalRequests) * 100 
      : 0;

    const avgResponseTime = totals.totalRequests > 0 
      ? totals.totalResponseTime / totals.totalRequests 
      : 0;

    const bandwidthSaved = totals.bytesSent > 0 
      ? (totals.bytesFromCache / totals.bytesSent) * 100 
      : 0;

    res.json({
      period: '24h',
      totalRequests: totals.totalRequests,
      cacheHits: totals.cacheHits,
      cacheMisses: totals.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      bytesSent: totals.bytesSent,
      bytesFromCache: totals.bytesFromCache,
      bandwidthSaved: Math.round(bandwidthSaved * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get bandwidth over time with configurable time range and bucket size
router.get('/bandwidth', authMiddleware, async (req, res) => {
  try {
    // Time range presets: 5m, 30m, 1h, 6h, 24h, today
    const range = (req.query.range as string) || '1h';
    
    // Calculate time range and bucket size
    const now = new Date();
    let since: Date;
    let bucketMinutes: number;
    
    switch (range) {
      case '5m':
        since = new Date(now.getTime() - 5 * 60 * 1000);
        bucketMinutes = 1; // 1-minute buckets for 5-min view
        break;
      case '30m':
        since = new Date(now.getTime() - 30 * 60 * 1000);
        bucketMinutes = 5; // 5-minute buckets for 30-min view
        break;
      case '1h':
        since = new Date(now.getTime() - 60 * 60 * 1000);
        bucketMinutes = 5; // 5-minute buckets for 1-hour view
        break;
      case '6h':
        since = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        bucketMinutes = 30; // 30-minute buckets for 6-hour view
        break;
      case '24h':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        bucketMinutes = 60; // 1-hour buckets for 24-hour view
        break;
      case 'today':
        since = new Date(now);
        since.setHours(0, 0, 0, 0);
        bucketMinutes = 60; // 1-hour buckets for today view
        break;
      default:
        since = new Date(now.getTime() - 60 * 60 * 1000);
        bucketMinutes = 5;
    }

    const stats = await CacheStats.findAll({
      where: {
        timestamp: { [Op.gte]: since },
        period: 'minute',
      },
      order: [['timestamp', 'ASC']],
    });

    // Group by bucket intervals
    const bucketStats = new Map<string, {
      timestamp: string;
      bytesSent: number;
      bytesFromCache: number;
      requests: number;
    }>();

    // Round timestamp down to nearest bucket
    const getBucketKey = (date: Date): string => {
      const d = new Date(date);
      const minutes = d.getMinutes();
      const roundedMinutes = Math.floor(minutes / bucketMinutes) * bucketMinutes;
      d.setMinutes(roundedMinutes, 0, 0);
      return d.toISOString();
    };

    stats.forEach((stat) => {
      const bucketKey = getBucketKey(new Date(stat.timestamp));
      const existing = bucketStats.get(bucketKey) || {
        timestamp: bucketKey,
        bytesSent: 0,
        bytesFromCache: 0,
        requests: 0,
      };

      existing.bytesSent += Number(stat.bytesSent);
      existing.bytesFromCache += Number(stat.bytesFromCache);
      existing.requests += stat.totalRequests;

      bucketStats.set(bucketKey, existing);
    });

    // Fill in empty buckets for a continuous chart
    const result: { timestamp: string; bytesSent: number; bytesFromCache: number; requests: number }[] = [];
    const bucketMs = bucketMinutes * 60 * 1000;
    let currentBucket = new Date(Math.floor(since.getTime() / bucketMs) * bucketMs);
    
    while (currentBucket <= now) {
      const key = currentBucket.toISOString();
      const existing = bucketStats.get(key);
      result.push(existing || {
        timestamp: key,
        bytesSent: 0,
        bytesFromCache: 0,
        requests: 0,
      });
      currentBucket = new Date(currentBucket.getTime() + bucketMs);
    }

    res.json({
      range,
      bucketMinutes,
      data: result,
    });
  } catch (error) {
    console.error('Bandwidth stats error:', error);
    res.status(500).json({ error: 'Failed to get bandwidth stats' });
  }
});

// Get per-domain stats
router.get('/domains', authMiddleware, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = parseInt(req.query.limit as string) || 20;
    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get recent access logs and aggregate in JS for simpler typing
    const logs = await AccessLog.findAll({
      where: {
        timestamp: { [Op.gte]: since },
      },
      attributes: ['url', 'bytesSent', 'cacheStatus'],
      raw: true,
    });

    // Aggregate by domain
    const domainMap = new Map<string, { requests: number; bytes: number; hits: number }>();
    
    logs.forEach((log: any) => {
      const match = log.url?.match(/https?:\/\/([^\/]+)/);
      const domain = match ? match[1] : 'unknown';
      const existing = domainMap.get(domain) || { requests: 0, bytes: 0, hits: 0 };
      existing.requests++;
      existing.bytes += Number(log.bytesSent) || 0;
      if (log.cacheStatus?.includes('HIT')) {
        existing.hits++;
      }
      domainMap.set(domain, existing);
    });

    // Convert to array and sort
    const domainStats = Array.from(domainMap.entries())
      .map(([domain, stats]) => ({ domain, ...stats }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);

    res.json(domainStats);
  } catch (error) {
    console.error('Domain stats error:', error);
    res.status(500).json({ error: 'Failed to get domain stats' });
  }
});

export default router;
