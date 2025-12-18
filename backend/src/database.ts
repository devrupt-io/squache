import { Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const databaseUrl = process.env.DATABASE_URL || 'postgres://devrupt:devrupt@postgres:5432/squache';

// Disable SSL for internal Docker network connections
// Enable SSL only when DATABASE_SSL is explicitly set to 'true'
const useSSL = process.env.DATABASE_SSL === 'true';

export const sequelize = new Sequelize(databaseUrl, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: useSSL ? {
    ssl: { rejectUnauthorized: false },
  } : {},
});

// Import models
import { User } from './models/User';
import { AccessLog } from './models/AccessLog';
import { CacheStats } from './models/CacheStats';
import { UpstreamProxy } from './models/UpstreamProxy';
import { Config } from './models/Config';

// Import services
import { applySettings } from './services/squidConfig';

/**
 * Generate a random password for admin user
 */
function generatePassword(): string {
  return crypto.randomBytes(16).toString('base64').slice(0, 20);
}

export async function initializeDatabase() {
  // Sync all models
  await sequelize.sync({ alter: true });

  // Handle admin user creation/password reset
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@squache.local';
  let adminPass = process.env.ADMIN_PASS;

  // Generate password if not provided
  if (!adminPass || adminPass.trim() === '') {
    adminPass = generatePassword();
    console.log('');
    console.log('='.repeat(60));
    console.log('  SQUACHE ADMIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPass}`);
    console.log('');
    console.log('  Set ADMIN_PASS environment variable to use a fixed password.');
    console.log('='.repeat(60));
    console.log('');
  }

  const hashedPassword = await bcrypt.hash(adminPass, 10);
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });

  if (!existingAdmin) {
    // Create new admin user
    await User.create({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    // Reset password on every startup to match ADMIN_PASS (or generated password)
    await existingAdmin.update({ password: hashedPassword });
    console.log(`Admin password reset for: ${adminEmail}`);
  }

  // Initialize default config if not exists
  const existingConfig = await Config.findOne({ where: { key: 'caching_enabled' } });
  if (!existingConfig) {
    await Config.bulkCreate([
      { key: 'caching_enabled', value: 'true', description: 'Enable/disable caching' },
      { key: 'max_object_size', value: '1073741824', description: 'Maximum object size in bytes (1GB)' },
      { key: 'cache_size', value: '10737418240', description: 'Total cache size in bytes (10GB)' },
      { key: 'memory_cache_size', value: '536870912', description: 'Memory cache size in bytes (512MB)' },
      { key: 'default_upstream', value: 'direct', description: 'Default upstream proxy type' },
      { key: 'ssl_bump_enabled', value: 'true', description: 'Enable SSL bumping for HTTPS traffic' },
      { key: 'aggressive_caching', value: 'true', description: 'Override cache headers for static assets' },
      { key: 'log_retention_days', value: '30', description: 'Number of days to retain access logs' },
    ]);
    console.log('Default configuration created.');
  }

  // Apply current settings to Squid on startup
  try {
    const allConfig = await Config.findAll();
    const configObj: Record<string, string> = {};
    allConfig.forEach((item) => {
      configObj[item.key] = item.value;
    });
    const result = await applySettings(configObj);
    console.log('Squid settings applied on startup:', result.message);
  } catch (error) {
    console.error('Failed to apply Squid settings on startup:', error);
  }
}

export { User, AccessLog, CacheStats, UpstreamProxy, Config };
