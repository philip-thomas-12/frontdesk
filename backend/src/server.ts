import { createApp } from './app';
import { config } from './config/env';
import { startAutoCloseJob } from './jobs/autoClose.job';
import { runStartupSeed } from './utils/startupSeed';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`🚀 Frontdesk API server running at http://localhost:${config.port}`);
  console.log(`⏱️ Business Hours: 09:30 - 18:30 (Asia/Kolkata)`);

  // Auto-seed the database if it's empty (runs on every cold start, skips if already seeded)
  runStartupSeed().catch((e) => console.error('Startup seed error:', e));

  // Start background auto-close job
  startAutoCloseJob();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

