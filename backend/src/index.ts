import express from 'express';
import cors from 'cors';
import { sequelize, initializeDatabase } from './database';
import authRouter from './routes/auth';
import statsRouter from './routes/stats';
import cacheRouter from './routes/cache';
import logsRouter from './routes/logs';
import configRouter from './routes/config';
import upstreamsRouter from './routes/upstreams';
import domainsRouter from './routes/domains';
import { LogParser } from './services/logParser';

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3011',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'squache-backend' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/stats', statsRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/logs', logsRouter);
app.use('/api/config', configRouter);
app.use('/api/upstreams', upstreamsRouter);
app.use('/api/domains', domainsRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    await initializeDatabase();
    console.log('Database initialized.');

    // Start log parser
    const logParser = new LogParser();
    logParser.start();
    console.log('Log parser started.');

    app.listen(PORT, () => {
      console.log(`Squache backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
