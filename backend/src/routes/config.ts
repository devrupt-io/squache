import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../database';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { applySettings } from '../services/squidConfig';

const router = Router();

// Path to SSL certificate (mounted from squache-proxy)
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/etc/squid/ssl/squid-ca.crt';

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

// Download SSL CA certificate
router.get('/ssl/certificate', authMiddleware, async (req, res) => {
  try {
    // Check if certificate file exists
    if (!fs.existsSync(SSL_CERT_PATH)) {
      return res.status(404).json({ 
        error: 'SSL certificate not found',
        message: 'The CA certificate has not been generated yet. Please run the SSL setup script.'
      });
    }

    // Read the certificate
    const cert = await fs.promises.readFile(SSL_CERT_PATH, 'utf-8');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/x-x509-ca-cert');
    res.setHeader('Content-Disposition', 'attachment; filename="squache-ca.crt"');
    res.send(cert);
  } catch (error) {
    console.error('SSL certificate download error:', error);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

// Check if SSL certificate exists
router.get('/ssl/status', authMiddleware, async (req, res) => {
  try {
    const exists = fs.existsSync(SSL_CERT_PATH);
    
    if (exists) {
      const stats = await fs.promises.stat(SSL_CERT_PATH);
      const cert = await fs.promises.readFile(SSL_CERT_PATH, 'utf-8');
      
      // Extract basic cert info (CN from subject)
      const cnMatch = cert.match(/Subject:.*CN\s*=\s*([^,\n]+)/);
      const notAfterMatch = cert.match(/Not After\s*:\s*([^\n]+)/);
      
      res.json({
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        // These would require parsing the cert properly, just return basic info
        filename: 'squache-ca.crt',
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('SSL status check error:', error);
    res.status(500).json({ error: 'Failed to check certificate status' });
  }
});

export default router;
