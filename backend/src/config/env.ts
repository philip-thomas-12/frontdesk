import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/frontdesk_db?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'frontdesk_jwt_secret_dev_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  slaTimezone: process.env.SLA_TIMEZONE || 'Asia/Kolkata',
  autoCloseIntervalMs: parseInt(process.env.AUTO_CLOSE_INTERVAL_MS || '3600000', 10),
};

