import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const execAsync = promisify(exec);

const SQUID_CACHE_DIR = process.env.SQUID_CACHE_DIR || '/var/spool/squid';

// List cached objects (limited info)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Get cache directory size
    const { stdout: sizeOutput } = await execAsync(`du -sh ${SQUID_CACHE_DIR} 2>/dev/null || echo "0"`);
    const cacheSize = sizeOutput.trim().split('\t')[0];

    // Get number of cached objects (approximate by counting swap.state)
    let objectCount = 0;
    try {
      const { stdout: countOutput } = await execAsync(`find ${SQUID_CACHE_DIR} -type f | wc -l`);
      objectCount = parseInt(countOutput.trim(), 10) || 0;
    } catch {
      // Directory might not exist yet
    }

    res.json({
      cacheDirectory: SQUID_CACHE_DIR,
      usedSize: cacheSize,
      objectCount,
    });
  } catch (error) {
    console.error('Cache info error:', error);
    res.status(500).json({ error: 'Failed to get cache info' });
  }
});

// Purge all cache
router.delete('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    // Send PURGE signal to Squid (requires squidclient)
    await execAsync(`squidclient -m PURGE mgr:fqdncache 2>/dev/null || true`);
    await execAsync(`squidclient -m PURGE mgr:ipcache 2>/dev/null || true`);
    
    // Clear cache directory
    await execAsync(`rm -rf ${SQUID_CACHE_DIR}/* 2>/dev/null || true`);

    res.json({ message: 'Cache purged successfully' });
  } catch (error) {
    console.error('Cache purge error:', error);
    res.status(500).json({ error: 'Failed to purge cache' });
  }
});

// Purge cache by URL pattern
router.delete('/:pattern', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const pattern = decodeURIComponent(req.params.pattern);

    // Use squidclient to purge specific URLs
    await execAsync(`squidclient -m PURGE "${pattern}" 2>/dev/null || true`);

    res.json({ message: `Cache purged for pattern: ${pattern}` });
  } catch (error) {
    console.error('Cache pattern purge error:', error);
    res.status(500).json({ error: 'Failed to purge cache pattern' });
  }
});

export default router;
