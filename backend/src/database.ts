import { Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';

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

export async function initializeDatabase() {
  // Sync all models
  await sequelize.sync({ alter: true });

  // Create admin user if it doesn't exist
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASS;

  if (adminEmail && adminPass) {
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPass, 10);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
      });
      console.log(`Admin user created: ${adminEmail}`);
    }
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
    ]);
    console.log('Default configuration created.');
  }
}

export { User, AccessLog, CacheStats, UpstreamProxy, Config };
