import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Debug from 'debug';

// Phase 1: Load environment variables
dotenv.config();
const log = Debug('jobintel:server');

// Phase 1: Import configurations
import { connectDB } from './config/db';
import { initRedis } from './config/redis';
import { initQueues, closeQueues } from './config/queues';
import { initScheduler, stopScheduler } from './config/scheduler';
import { logger, logError } from './utils/logger';
import { initPhase3Services } from './services/phase3';
import { initPhase4Services } from './services/phase4';

// Import routes
import authRoutes from './routes/auth';
import jobRoutes from './routes/job';
import companyRoutes from './routes/company';
import applicationRoutes from './routes/application';
import seoRoutes from './routes/seo';
import openapiRoutes from './routes/openapi';
import notificationRoutes from './routes/notification';
import notificationCrudRoutes from './routes/notificationCrud';
import messageCrudRoutes from './routes/messageCrud';
import paymentsRoutes from './routes/payments';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import sourceAdminRoutes from './routes/source';
import userRoutes from './routes/user';
import skillsRoutes from './routes/skills';
import profileFieldsRoutes from './routes/profileFields';
import analyticsRoutes from './routes/analytics';
import jsearchRoutes from './routes/jsearch';
import matchingRoutes from './routes/matching';
import resumeRoutes from './routes/resume';
import { trackPageView } from './middleware/analytics';

// ========================================
// PHASE 1: Express App Setup
// ========================================

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

const app: Express = express();

// Phase 1: CORS Configuration
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  const origins = corsOrigin
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    const originNorm = origin ? origin.replace(/\/$/, '') : undefined;
    if (origin && (origin === '*' || (originNorm && origins.includes(originNorm)))) {
      res.setHeader('Access-Control-Allow-Origin', origin === '*' ? '*' : origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const originNorm = (origin as string).replace(/\/$/, '');
        if (origin === '*' || origins.includes(originNorm)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    })
  );
} else {
  app.use(cors());
}

// Phase 1: Request body parsing
app.use(
  express.json({
    verify: (req: any, _res, buf: Buffer, _encoding) => {
      req.rawBody = buf && buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Phase 1: Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Phase 1: Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logError(err, { context: 'global-error-handler' });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// ========================================
// PHASE 1: Health Check & Status Endpoint
// ========================================

app.get('/api/health', async (_req: Request, res: Response) => {
  const ok: any = {
    service: 'jobintel-backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0-phase1',
  };

  // Check MongoDB
  try {
    const mongoose = require('mongoose');
    const ready = mongoose.connection && mongoose.connection.readyState === 1;
    ok.mongodb = ready ? 'connected' : 'disconnected';
    if (!ready) ok.status = 'degraded';
  } catch (e) {
    ok.mongodb = 'error';
    ok.status = 'degraded';
  }

  // Check Redis
  try {
    const { getRedis } = require('./config/redis');
    const redis = getRedis();
    const ping = await redis.ping();
    ok.redis = ping === 'PONG' ? 'connected' : 'disconnected';
  } catch (e) {
    ok.redis = process.env.REDIS_URL ? 'disconnected' : 'not-configured';
    if (ok.redis === 'disconnected') ok.status = 'degraded';
  }

  // Check Queues
  try {
    const { getQueueStats } = require('./config/queues');
    const stats = await getQueueStats();
    ok.queues = {
      scraping: stats.scraping.waiting + stats.scraping.active,
      notification: stats.notification.waiting + stats.notification.active,
      matching: stats.matching.waiting + stats.matching.active,
    };
  } catch (e) {
    ok.queues = 'error';
    ok.status = 'degraded';
  }

  const statusCode = ok.status === 'ok' ? 200 : 503;
  return res.status(statusCode).json(ok);
});

// Phase 1: Status/Stats endpoint
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const { getQueueStats } = require('./config/queues');
    const { getSchedulerStatus } = require('./config/scheduler');
    const { getApiUsage } = require('./utils/openWebNinjaClient');

    const queueStats = await getQueueStats();
    const schedulerStatus = getSchedulerStatus();

    res.json({
      service: 'jobintel-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      queues: queueStats,
      scheduler: schedulerStatus,
      environment: process.env.NODE_ENV,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ========================================
// PHASE 1: Route Mounting
// ========================================

// Add page view tracking middleware
app.use(trackPageView);

// Phase 1: Auth routes
app.use('/api/auth', authRoutes);

// Legacy routes (keep for backward compatibility)
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/docs', openapiRoutes);
app.use(seoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', sourceAdminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile-fields', profileFieldsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/jsearch', jsearchRoutes);
app.use('/api/notifications', notificationCrudRoutes);
app.use('/api/messages', messageCrudRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/resume', resumeRoutes);

// ========================================
// PHASE 1: Admin Initialization
// ========================================

async function ensureAdminExists() {
  try {
    const bcrypt = require('bcryptjs');
    const { User } = require('./models/User');

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@jobintel.local';
    const adminPassword = process.env.SEED_ADMIN_PASS || 'admin123456';

    // Check if admin already exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      log(`ℹ️  Admin user already exists: ${adminEmail}`);
      return;
    }

    // Create admin user
    const hash = await bcrypt.hash(adminPassword, 10);
    const admin = await User.create({
      email: adminEmail,
      passwordHash: hash,
      name: 'Admin',
      roles: ['admin'],
    });

    logger.info(`✓ Admin user created: ${adminEmail}`);
    log(`✓ Admin user created: ${adminEmail}`);
  } catch (err) {
    logger.warn(`⚠️  Could not ensure admin exists:`, { error: (err as Error).message });
    log(`⚠️  Could not ensure admin exists: ${(err as Error).message}`);
  }
}

// ========================================
// PHASE 1: Server Startup
// ========================================

let server: any = null;

async function start() {
  try {
    log('🚀 Starting JobIntel Backend (Phase 1)...');

    // 1. Connect to MongoDB
    log('📦 Connecting to MongoDB...');
    await connectDB(MONGODB_URI);
    log('✓ MongoDB connected');

    // 1.5. Ensure admin user exists
    log('📦 Ensuring admin user exists...');
    await ensureAdminExists();

    // 2. Initialize Redis
    log('📦 Initializing Redis...');
    const redis = await initRedis();
    log('✓ Redis initialized');

    // 3. Initialize BullMQ Queues
    log('📦 Initializing BullMQ Queues...');
    await initQueues();
    log('✓ BullMQ Queues initialized');

    // 4. Initialize Scheduler
    log('📦 Initializing Scheduler...');
    initScheduler();
    log('✓ Scheduler initialized');

    // 4.5 Initialize Phase-3 services (normalization, dedupe, matching, scraping)
    log('📦 Initializing Phase-3 services...');
    await initPhase3Services();
    log('✓ Phase-3 services initialized');

    // 4.6 Initialize Phase-4 services (resume parsing + matching trigger)
    log('📦 Initializing Phase-4 services...');
    await initPhase4Services();
    log('✓ Phase-4 services initialized');

    // 5. Start Express Server
    server = app.listen(PORT, () => {
      log(`✓ Backend listening on http://localhost:${PORT}`);
      console.log(`
╔════════════════════════════════════════╗
║     JobIntel Backend - Phase 1         ║
║     🚀 Server Started Successfully    ║
╠════════════════════════════════════════╣
║ HTTP:       http://localhost:${PORT}       ║
║ Health:     http://localhost:${PORT}/api/health   ║
║ Status:     http://localhost:${PORT}/api/status    ║
║ Environment: ${process.env.NODE_ENV || 'development'}              ║
║ MongoDB:    ${MONGODB_URI ? '✓ Connected' : '✗ Not configured'}         ║
║ Redis:      ✓ Connected                 ║
║ Queues:     ✓ Initialized               ║
║ Scheduler:  ✓ Running                   ║
╚════════════════════════════════════════╝
      `);

      // Log configuration
      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
      const whatsappConfigured = !!process.env.WHATSAPP_API_KEY;
      const telegramConfigured = !!process.env.TELEGRAM_BOT_TOKEN;

      logger.info('Configuration:', {
        smtp: smtpConfigured,
        whatsapp: whatsappConfigured,
        telegram: telegramConfigured,
        apiRateLimit: process.env.API_RATE_LIMIT_REQUESTS,
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    async function shutdown() {
      log('🛑 Shutting down gracefully...');

      try {
        if (server) {
          server.close(() => {
            log('✓ HTTP server closed');
          });
        }

        stopScheduler();
        log('✓ Scheduler stopped');

        await closeQueues();
        log('✓ Queues closed');

        await redis.quit();
        log('✓ Redis disconnected');

        process.exit(0);
      } catch (err) {
        logError(err as Error, { context: 'shutdown' });
        process.exit(1);
      }
    }
  } catch (err) {
    logError(err as Error, { context: 'startup' });
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
start();

export default app;
