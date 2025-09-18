import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

export const redisClient = new Redis(redisConfig);

// Named export maintained for existing imports like cache.service
export const redis = redisClient;

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const shouldAutoConnect = REDIS_ENABLED && process.env.NODE_ENV !== 'test';

let redisAvailable = false;
let hasLoggedRedisError = false;

const logRedisWarning = (message: string, error?: unknown) => {
  const details = error instanceof Error ? error.message : error;
  console.warn(`[redis] ${message}${details ? `: ${details}` : ''}`);
};

const markUnavailable = () => {
  redisAvailable = false;
};

if (REDIS_ENABLED) {
  redisClient.on('ready', () => {
    redisAvailable = true;
    hasLoggedRedisError = false;
    console.info('[redis] connection established');
  });

  redisClient.on('end', () => {
    markUnavailable();
    if (!hasLoggedRedisError) {
      logRedisWarning('connection ended');
      hasLoggedRedisError = true;
    }
  });

  redisClient.on('close', () => {
    markUnavailable();
  });

  redisClient.on('reconnecting', () => {
    markUnavailable();
  });

  redisClient.on('error', (error) => {
    markUnavailable();
    if (!hasLoggedRedisError) {
      logRedisWarning('connection error', error);
      hasLoggedRedisError = true;
    }
  });

  if (shouldAutoConnect) {
    void redisClient.connect().catch((error) => {
      markUnavailable();
      if (!hasLoggedRedisError) {
        logRedisWarning('initial connection failed', error);
        hasLoggedRedisError = true;
      }
    });
  } else {
    console.info('[redis] auto-connect skipped (disabled or test environment).');
  }
} else {
  console.info('[redis] disabled via REDIS_ENABLED=false. Using in-memory fallbacks.');
}

export function isRedisAvailable(): boolean {
  return REDIS_ENABLED && redisAvailable;
}

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

export default redisClient;


