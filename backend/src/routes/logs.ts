import { Router } from 'express';
import { Op } from 'sequelize';
import { AccessLog } from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get recent logs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await AccessLog.findAndCountAll({
      order: [['timestamp', 'DESC']],
      limit,
      offset,
    });

    res.json({
      logs: logs.rows,
      total: logs.count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Search logs
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { url, ip, status, method, from, to } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};

    if (url) {
      where.url = { [Op.iLike]: `%${url}%` };
    }

    if (ip) {
      where.clientIp = ip;
    }

    if (status) {
      where.httpStatus = parseInt(status as string, 10);
    }

    if (method) {
      where.method = (method as string).toUpperCase();
    }

    if (from || to) {
      where.timestamp = {};
      if (from) {
        where.timestamp[Op.gte] = new Date(from as string);
      }
      if (to) {
        where.timestamp[Op.lte] = new Date(to as string);
      }
    }

    const logs = await AccessLog.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset,
    });

    res.json({
      logs: logs.rows,
      total: logs.count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Logs search error:', error);
    res.status(500).json({ error: 'Failed to search logs' });
  }
});

export default router;
