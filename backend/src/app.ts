import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import ticketRoutes from './routes/ticket.routes';
import customerRoutes from './routes/customer.routes';
import { errorHandler } from './middleware/errorHandler.middleware';

export function createApp() {
  const app = express();

  // Basic security and parsing
  const allowedOrigins = [
    config.corsOrigin,
    'http://localhost:4200',
    'https://frontdesk-ruby-two.vercel.app',
  ].filter(Boolean);

  app.use(
    cors({
      // Reflect explicitly allowed origins (wildcard cannot be combined with credentials)
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        try {
          if (new URL(origin).hostname.endsWith('.vercel.app')) return callback(null, true);
        } catch {
          /* malformed origin */
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Root welcoming endpoint (prevents "Cannot GET /" on Render)
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ONLINE',
      system: 'Frontdesk API — Arvo Systems Support Ticket Management',
      version: '1.0.0',
      health: '/api/health',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth/login',
        dashboard: '/api/dashboard/stats',
        tickets: '/api/tickets',
        customer: '/api/customer/tickets/:id',
      },
      message: 'Frontdesk backend is running and operational.',
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      system: 'Frontdesk API',
      timestamp: new Date().toISOString(),
    });
  });

  // DB connectivity diagnostic (non-sensitive — hides internal errors in production)
  app.get('/api/health/db', async (req, res) => {
    const prisma = (await import('./config/db')).default;
    try {
      const userCount = await prisma.user.count();
      res.status(200).json({ status: 'DB_CONNECTED', userCount, timestamp: new Date().toISOString() });
    } catch (err: any) {
      const isProd = process.env.NODE_ENV === 'production';
      res.status(503).json({
        status: 'DB_ERROR',
        message: isProd ? 'Database connection unavailable' : err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Background cron hook: protected by shared secret header or query param
  // Can be called by external cron services (e.g. cron-job.org / GitHub Actions)
  app.post('/api/cron/auto-close', async (req, res) => {
    const expectedSecret = process.env.CRON_SECRET || 'frontdesk_cron_secret_2026';
    const providedSecret = req.headers['x-cron-secret'] || req.query.secret;

    if (providedSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing or invalid x-cron-secret header',
      });
    }

    try {
      const lifecycleService = (await import('./services/ticketLifecycle.service')).default;
      const result = await lifecycleService.processAutoClosure();
      res.status(200).json({
        success: true,
        message: 'Auto-closure sweep completed',
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Auto-closure sweep failed' });
    }
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/customer', customerRoutes);

  // Centralized error handling
  app.use(errorHandler);

  return app;
}

export default createApp;

