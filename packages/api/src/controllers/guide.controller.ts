import { Request, Response } from 'express';
import { GuideService } from '../services/guide.service.js';
import { CreateGuideInput, UpdateGuideInput, GuideFilters } from '../models/guide.model.js';

const guideService = new GuideService();

export class GuideController {
  /**
   * Create a new guide
   */
  async createGuide(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const input: CreateGuideInput = req.body;
      const guide = await guideService.createGuide(userId, input);

      res.status(201).json(guide);
    } catch (error) {
      console.error('Error creating guide:', error);
      res.status(500).json({ error: 'Failed to create guide' });
    }
  }

  /**
   * Get a guide by ID
   */
  async getGuide(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const guide = await guideService.getGuide(id, userId);

      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      res.json(guide);
    } catch (error) {
      console.error('Error getting guide:', error);
      res.status(500).json({ error: 'Failed to get guide' });
    }
  }

  /**
   * Update a guide
   */
  async updateGuide(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const input: UpdateGuideInput = req.body;
      const guide = await guideService.updateGuide(id, userId, input);

      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      res.json(guide);
    } catch (error) {
      console.error('Error updating guide:', error);
      res.status(500).json({ error: 'Failed to update guide' });
    }
  }

  /**
   * Delete a guide
   */
  async deleteGuide(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await guideService.deleteGuide(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting guide:', error);
      res.status(500).json({ error: 'Failed to delete guide' });
    }
  }

  /**
   * List guides with filtering and pagination
   */
  async listGuides(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const filters: GuideFilters = {
        search: req.query.search as string,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        status: req.query.status as any,
        difficulty: req.query.difficulty as any,
        language: req.query.language as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC'
      };

      const result = await guideService.listGuides(userId, filters);
      res.json(result);
    } catch (error) {
      console.error('Error listing guides:', error);
      res.status(500).json({ error: 'Failed to list guides' });
    }
  }

  /**
   * Get guide analytics
   */
  async getGuideAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const analytics = await guideService.getGuideAnalytics(id, userId);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting guide analytics:', error);
      res.status(500).json({ error: 'Failed to get guide analytics' });
    }
  }

  /**
   * Increment guide view count (public endpoint)
   */
  async incrementViewCount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await guideService.incrementViewCount(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error incrementing view count:', error);
      res.status(500).json({ error: 'Failed to increment view count' });
    }
  }

  /**
   * Track guide view (analytics)
   */
  async trackView(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { timestamp, userAgent, referrer, viewport } = req.body;
      
      await guideService.trackView(id, {
        timestamp,
        userAgent,
        referrer,
        viewport
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking view:', error);
      res.status(500).json({ error: 'Failed to track view' });
    }
  }

  /**
   * Track step view (analytics)
   */
  async trackStepView(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stepIndex, timestamp } = req.body;
      
      await guideService.trackStepView(id, stepIndex, timestamp);
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking step view:', error);
      res.status(500).json({ error: 'Failed to track step view' });
    }
  }

  /**
   * Track step time (analytics)
   */
  async trackStepTime(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stepIndex, timeSpent, timestamp } = req.body;
      
      await guideService.trackStepTime(id, stepIndex, timeSpent, timestamp);
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking step time:', error);
      res.status(500).json({ error: 'Failed to track step time' });
    }
  }

  /**
   * Track guide completion (analytics)
   */
  async trackCompletion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { totalTime, timestamp, completedSteps } = req.body;
      
      await guideService.trackCompletion(id, {
        totalTime,
        timestamp,
        completedSteps
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking completion:', error);
      res.status(500).json({ error: 'Failed to track completion' });
    }
  }

  /**
   * Track engagement (analytics)
   */
  async trackEngagement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, data, timestamp } = req.body;
      
      await guideService.trackEngagement(id, action, data, timestamp);
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking engagement:', error);
      res.status(500).json({ error: 'Failed to track engagement' });
    }
  }
}