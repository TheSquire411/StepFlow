import Redis from 'ioredis';
import { config } from './database';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

export const redis = new Redis(redisConfig);

// Cache key prefixes
export const CACHE_KEYS = {
  GUIDE: 'guide:',
  USER_GUIDES: 'user_guides:',
  GUIDE_ANALYTICS: 'guide_analytics:',
  POPULAR_GUIDES: 'popular_guides',
  GUIDE_SEARCH: 'guide_search:',
} as const;

// Cache TTL in seconds
export const CACHE_TTL = {
  GUIDE: 3600, // 1 hour
  USER_GUIDES: 1800, // 30 minutes
  GUIDE_ANALYTICS: 300, // 5 minutes
  POPULAR_GUIDES: 7200, // 2 hours
  GUIDE_SEARCH: 600, // 10 minutes
} as const;

export default redis;