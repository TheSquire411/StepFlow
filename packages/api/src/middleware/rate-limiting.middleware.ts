import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response, NextFunction } from 'express';
import { redisClient, isRedisAvailable } from '../config/redis';
import { logger } from '../services/sentry.service';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string | Record<string, unknown>;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

type RateLimitOptions = Parameters<typeof rateLimit>[0];
type RateLimitHandler = ReturnType<typeof rateLimit>;

const createAdaptiveRateLimiter = (options: RateLimitOptions): RateLimitHandler => {
  const memoryLimiter = rateLimit({
    ...options,
    store: new rateLimit.MemoryStore(),
  });

  let redisLimiter: RateLimitHandler | null = null;
  let warnedFallback = false;

  const getRedisLimiter = (): RateLimitHandler => {
    if (!redisLimiter) {
      redisLimiter = rateLimit({
        ...options,
        store: new RedisStore({
          sendCommand: (...args: string[]) => redisClient.call(...args),
        }),
      });
    }
    return redisLimiter;
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (isRedisAvailable()) {
      warnedFallback = false;
      return getRedisLimiter()(req, res, next);
    }

    if (!warnedFallback) {
      logger.warn('Redis unavailable. Falling back to in-memory rate limiting.', {
        ip: req.ip,
        path: req.path,
        userId: req.user?.id,
      });
      warnedFallback = true;
    }

    return memoryLimiter(req, res, next);
  };
};

export class RateLimitingMiddleware {
  /**
   * General API rate limiting
   */
  static general = createAdaptiveRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    onLimitReached: (req: Request) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        userId: req.user?.id,
      });
    },
  });

  /**
   * Authentication endpoints rate limiting (stricter)
   */
  static auth = createAdaptiveRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        timestamp: new Date().toISOString(),
      },
    },
    skipSuccessfulRequests: true,
    keyGenerator: (req: Request) => `auth:${req.ip}`,
    onLimitReached: (req: Request) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        body: { email: req.body?.email }, // Log email but not password
      });
    },
  });

  /**
   * File upload rate limiting
   */
  static fileUpload = createAdaptiveRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each user to 50 uploads per hour
    message: {
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later',
        timestamp: new Date().toISOString(),
      },
    },
    keyGenerator: (req: Request) => `upload:${req.user?.id || req.ip}`,
    onLimitReached: (req: Request) => {
      logger.warn('Upload rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
      });
    },
  });

  /**
   * AI processing rate limiting
   */
  static aiProcessing = createAdaptiveRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each user to 20 AI processing requests per hour
    message: {
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
        message: 'Too many AI processing requests, please try again later',
        timestamp: new Date().toISOString(),
      },
    },
    keyGenerator: (req: Request) => `ai:${req.user?.id || req.ip}`,
    onLimitReached: (req: Request) => {
      logger.warn('AI processing rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
      });
    },
  });

  /**
   * Password reset rate limiting
   */
  static passwordReset = createAdaptiveRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
      error: {
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts, please try again later',
        timestamp: new Date().toISOString(),
      },
    },
    keyGenerator: (req: Request) => `pwd-reset:${req.ip}`,
    onLimitReached: (req: Request) => {
      logger.warn('Password reset rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body?.email,
      });
    },
  });

  /**
   * Create custom rate limiter
   */
  static custom(config: RateLimitConfig) {
    return createAdaptiveRateLimiter({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          timestamp: new Date().toISOString(),
        },
      },
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      skipFailedRequests: config.skipFailedRequests,
      keyGenerator: config.keyGenerator || ((req: Request) => req.ip),
      onLimitReached: (req: Request) => {
        logger.warn('Custom rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          userId: req.user?.id,
        });
      },
    });
  }
}

/**
 * DDoS protection middleware
 */
export class DDoSProtection {
  private static suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();
  private static readonly SUSPICIOUS_THRESHOLD = 100; // requests per minute
  private static readonly BAN_DURATION = 60 * 60 * 1000; // 1 hour

  static middleware = (req: Request, res: Response, next: Function) => {
    const ip = req.ip;
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    // Clean old entries
    if (minute % 5 === 0) { // Clean every 5 minutes
      DDoSProtection.cleanOldEntries();
    }

    // Check if IP is currently banned
    const ipData = DDoSProtection.suspiciousIPs.get(ip);
    if (ipData && (now - ipData.lastSeen) < DDoSProtection.BAN_DURATION && ipData.count > DDoSProtection.SUSPICIOUS_THRESHOLD) {
      logger.error('DDoS attack detected - IP banned', {
        ip,
        requestCount: ipData.count,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(429).json({
        error: {
          code: 'IP_BANNED',
          message: 'IP temporarily banned due to suspicious activity',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Track request
    if (ipData) {
      ipData.count++;
      ipData.lastSeen = now;
    } else {
      DDoSProtection.suspiciousIPs.set(ip, { count: 1, lastSeen: now });
    }

    // Check for suspicious activity
    if (ipData && ipData.count > DDoSProtection.SUSPICIOUS_THRESHOLD) {
      logger.warn('Suspicious activity detected', {
        ip,
        requestCount: ipData.count,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
    }

    next();
  };

  private static cleanOldEntries() {
    const now = Date.now();
    const cutoff = now - DDoSProtection.BAN_DURATION;

    for (const [ip, data] of DDoSProtection.suspiciousIPs.entries()) {
      if (data.lastSeen < cutoff) {
        DDoSProtection.suspiciousIPs.delete(ip);
      }
    }
  }
}


