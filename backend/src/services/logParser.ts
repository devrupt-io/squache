import { Tail } from 'tail';
import { AccessLog } from '../models/AccessLog';
import { CacheStats } from '../models/CacheStats';
import { Op } from 'sequelize';

const SQUID_LOG_PATH = process.env.SQUID_LOG_PATH || '/var/log/squid/access.log';

export class LogParser {
  private tail: Tail | null = null;
  private statsBuffer: {
    requests: number;
    hits: number;
    misses: number;
    bytes: number;
    cacheBytes: number;
    totalResponseTime: number;
  } = {
    requests: 0,
    hits: 0,
    misses: 0,
    bytes: 0,
    cacheBytes: 0,
    totalResponseTime: 0,
  };

  start() {
    try {
      this.tail = new Tail(SQUID_LOG_PATH, { follow: true, fromBeginning: false });

      this.tail.on('line', (line: string) => {
        this.parseLine(line);
      });

      this.tail.on('error', (error: Error) => {
        console.error('Log tail error:', error);
      });

      // Aggregate stats every minute
      setInterval(() => this.aggregateStats(), 60000);

      console.log(`Watching Squid log: ${SQUID_LOG_PATH}`);
    } catch (error) {
      console.error('Failed to start log parser:', error);
      // In development, the log file might not exist yet
      console.log('Log parser will retry when file becomes available.');
      setTimeout(() => this.start(), 30000);
    }
  }

  stop() {
    if (this.tail) {
      this.tail.unwatch();
      this.tail = null;
    }
  }

  // Parse Squid log line in squache format
  // Format: %ts.%03tu %6tr %>a %Ss/%03>Hs %<st %rm %ru %[un %Sh/%<a %mt "%{X-Squache-Upstream}>h" "%{X-Squache-Country}>h"
  private async parseLine(line: string) {
    try {
      // Example: 1702900000.123 150 192.168.1.1 TCP_HIT/200 12345 GET http://example.com/image.jpg - HIER_DIRECT/1.2.3.4 image/jpeg "vpn" "US"
      const regex = /^(\d+\.\d+)\s+(\d+)\s+(\S+)\s+(\S+)\/(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\/(\S+)\s+(\S+)\s+"([^"]*)"\s+"([^"]*)"/;
      const match = line.match(regex);

      if (!match) {
        // Fallback to simpler format
        const simpleMatch = line.match(/^(\d+\.\d+)\s+(\d+)\s+(\S+)\s+(\S+)\/(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\/(\S+)\s+(\S+)/);
        if (simpleMatch) {
          await this.saveLog(simpleMatch, null, null);
        }
        return;
      }

      const upstreamType = match[13] !== '-' ? match[13] : null;
      const upstreamCountry = match[14] !== '-' ? match[14] : null;

      await this.saveLog(match, upstreamType, upstreamCountry);
    } catch (error) {
      console.error('Error parsing log line:', error);
    }
  }

  private async saveLog(match: RegExpMatchArray, upstreamType: string | null, upstreamCountry: string | null) {
    const timestamp = new Date(parseFloat(match[1]) * 1000);
    const responseTime = parseInt(match[2], 10);
    const clientIp = match[3];
    const cacheStatus = match[4];
    const httpStatus = parseInt(match[5], 10);
    const bytesSent = parseInt(match[6], 10);
    const method = match[7];
    const url = match[8];
    const username = match[9] !== '-' ? match[9] : null;
    const hierarchyStatus = match[10];
    const serverIp = match[11];
    const mimeType = match[12];

    // Save to database
    await AccessLog.create({
      timestamp,
      responseTime,
      clientIp,
      cacheStatus,
      httpStatus,
      bytesSent,
      method,
      url,
      username,
      hierarchyStatus,
      serverIp,
      mimeType,
      upstreamType,
      upstreamCountry,
    });

    // Update stats buffer
    this.statsBuffer.requests++;
    this.statsBuffer.bytes += bytesSent;
    this.statsBuffer.totalResponseTime += responseTime;

    if (cacheStatus.includes('HIT')) {
      this.statsBuffer.hits++;
      this.statsBuffer.cacheBytes += bytesSent;
    } else {
      this.statsBuffer.misses++;
    }
  }

  private async aggregateStats() {
    if (this.statsBuffer.requests === 0) return;

    const now = new Date();
    // Round to the current minute
    now.setSeconds(0);
    now.setMilliseconds(0);

    await CacheStats.create({
      timestamp: now,
      period: 'minute',
      totalRequests: this.statsBuffer.requests,
      cacheHits: this.statsBuffer.hits,
      cacheMisses: this.statsBuffer.misses,
      bytesSent: this.statsBuffer.bytes,
      bytesFromCache: this.statsBuffer.cacheBytes,
      avgResponseTime: this.statsBuffer.requests > 0 
        ? this.statsBuffer.totalResponseTime / this.statsBuffer.requests 
        : 0,
    });

    // Reset buffer
    this.statsBuffer = {
      requests: 0,
      hits: 0,
      misses: 0,
      bytes: 0,
      cacheBytes: 0,
      totalResponseTime: 0,
    };

    // Clean up old logs (keep last 7 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    await AccessLog.destroy({
      where: {
        timestamp: { [Op.lt]: cutoff },
      },
    });
  }
}
