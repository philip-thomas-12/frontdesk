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
  app.use(
    cors({
      origin: '*', // Allow local frontend during development
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

