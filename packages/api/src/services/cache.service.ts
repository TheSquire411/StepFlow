import redis, { CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { Guide } from '../models/guide.model';

export class CacheService {
  // Guide caching
  async getGuide(guideId: string): Promise<Guide | null> {
    try {
      const cached = await redis.get(`${CACHE_KEYS.GUIDE}${guideId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setGuide(guide: Guide): Promise<void> {
    try {
      await redis.setex(
        `${CACHE_KEYS.GUIDE}${guide.id}`,
        CACHE_TTL.GUIDE,
        JSON.stringify(guide)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidateGuide(guideId: string): Promise<void> {
    try {
      await redis.del(`${CACHE_KEYS.GUIDE}${guideId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // User guides list caching
  async getUserGuides(userId: string): Promise<Guide[] | null> {
    try {
      const cached = await redis.get(`${CACHE_KEYS.USER_GUIDES}${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setUserGuides(userId: string, guides: Guide[]): Promise<void> {
    try {
      await redis.setex(
        `${CACHE_KEYS.USER_GUIDES}${userId}`,
        CACHE_TTL.USER_GUIDES,
        JSON.stringify(guides)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidateUserGuides(userId: string): Promise<void> {
    try {
      await redis.del(`${CACHE_KEYS.USER_GUIDES}${userId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Popular guides caching
  async getPopularGuides(): Promise<Guide[] | null> {
    try {
      const cached = await redis.get(CACHE_KEYS.POPULAR_GUIDES);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setPopularGuides(guides: Guide[]): Promise<void> {
    try {
      await redis.setex(
        CACHE_KEYS.POPULAR_GUIDES,
        CACHE_TTL.POPULAR_GUIDES,
        JSON.stringify(guides)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Search results caching
  async getSearchResults(query: string): Promise<Guide[] | null> {
    try {
      const cacheKey = `${CACHE_KEYS.GUIDE_SEARCH}${Buffer.from(query).toString('base64')}`;
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setSearchResults(query: string, results: Guide[]): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.GUIDE_SEARCH}${Buffer.from(query).toString('base64')}`;
      await redis.setex(cacheKey, CACHE_TTL.GUIDE_SEARCH, JSON.stringify(results));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Analytics caching
  async getGuideAnalytics(guideId: string): Promise<any | null> {
    try {
      const cached = await redis.get(`${CACHE_KEYS.GUIDE_ANALYTICS}${guideId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setGuideAnalytics(guideId: string, analytics: any): Promise<void> {
    try {
      await redis.setex(
        `${CACHE_KEYS.GUIDE_ANALYTICS}${guideId}`,
        CACHE_TTL.GUIDE_ANALYTICS,
        JSON.stringify(analytics)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Bulk cache invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Bulk cache invalidation error:', error);
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

export const cacheService = new CacheService();