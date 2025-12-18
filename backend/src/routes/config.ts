import { Router } from 'express';
import { Config } from '../database';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { applySettings } from '../services/squidConfig';

const router = Router();

// Get all config
router.get('/', authMiddleware, async (req, res) => {
  try {
    const config = await Config.findAll();
    
    // Transform to key-value object
    const configObj: Record<string, string> = {};
    config.forEach((item) => {
      configObj[item.key] = item.value;
    });

    res.json(configObj);
  } catch (error) {
    console.error('Config get error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Update config
router.put('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const updates = req.body;

    if (typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid config format' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await Config.upsert({
        key,
        value: String(value),
        description: null,
      });
    }

    // Apply config changes to Squid
    const allConfig = await Config.findAll();
    const configObj: Record<string, string> = {};
    allConfig.forEach((item) => {
      configObj[item.key] = item.value;
    });

    const result = await applySettings(configObj);
    console.log('Squid config apply result:', result);

    res.json({ 
      message: 'Configuration updated',
      squidStatus: result.message 
    });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Get single config value
router.get('/:key', authMiddleware, async (req, res) => {
  try {
    const config = await Config.findOne({
      where: { key: req.params.key },
    });

    if (!config) {
      return res.status(404).json({ error: 'Config key not found' });
    }

    res.json({
      key: config.key,
      value: config.value,
      description: config.description,
    });
  } catch (error) {
    console.error('Config get error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

export default router;
