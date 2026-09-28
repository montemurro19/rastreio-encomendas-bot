import { registerAs } from '@nestjs/config';

export const trackingConfig = registerAs('tracking', () => ({
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  intervalMinutes: parseInt(process.env.TRACKING_INTERVAL_MINUTES || '15', 10),
  jobAttempts: parseInt(process.env.TRACKING_JOB_ATTEMPTS || '3', 10),
}));
