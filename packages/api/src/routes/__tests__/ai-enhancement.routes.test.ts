import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import aiEnhancementRoutes from '../ai-enhancement.routes.js';

// Mock the controller
vi.mock('../ai-enhancement.controller.js', () => ({
  AIEnhancementController: vi.fn().mockImplementation(() => ({
    summarizeGuide: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      res.json({ success: true, data: { summary: 'Test summary' } });
    }),
    convertGuideFormat: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (req.body.format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(Buffer.from('PDF content'));
      }
      res.json({ success: true, data: { content: 'Converted content' } });
    }),
    translateGuide: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      res.json({ success: true, data: { translatedGuide: 'Translated content' } });
    }),
    assessContentQuality: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      res.json({ success: true, data: { qualityReport: { overallScore: 8 } } });
    }),
    getImprovementSuggestions: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      res.json({ success: true, data: { suggestions: [] } });
    }),
    getSupportedLanguages: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      res.json({ success: true, data: [{ code: 'es', name: 'Spanish' }] });
    }),
    getSupportedFormats: vi.fn((req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      res.json({ success: true, data: [{ format: 'pdf', name: 'PDF' }] });
    })
  }))
}));

// Mock the auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer valid-token') {
      req.user = { id: 'user-1' };
    }
    next();
  })
}));

describe('AI Enhancement Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai-enhancement', aiEnhancementRoutes);
  });

  describe('POST /guides/:guideId/summarize', () => {
    it('should summarize guide with valid authentication', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/summarize')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { summary: 'Test summary' }
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/summarize')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });

  describe('POST /guides/:guideId/convert', () => {
    it('should convert guide format with valid authentication', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/convert')
        .set('Authorization', 'Bearer valid-token')
        .send({
          format: 'html',
          includeImages: true,
          includeAnnotations: true
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { content: 'Converted content' }
      });
    });

    it('should handle PDF conversion', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/convert')
        .set('Authorization', 'Bearer valid-token')
        .send({
          format: 'pdf',
          includeImages: true,
          includeAnnotations: true
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toEqual(Buffer.from('PDF content'));
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/convert')
        .send({ format: 'pdf' })
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });

  describe('POST /guides/:guideId/translate', () => {
    it('should translate guide with valid authentication', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/translate')
        .set('Authorization', 'Bearer valid-token')
        .send({ targetLanguage: 'Spanish' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { translatedGuide: 'Translated content' }
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/ai-enhancement/guides/test-guide-1/translate')
        .send({ targetLanguage: 'Spanish' })
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });

  describe('GET /guides/:guideId/quality-assessment', () => {
    it('should assess content quality with valid authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/guides/test-guide-1/quality-assessment')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { qualityReport: { overallScore: 8 } }
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/guides/test-guide-1/quality-assessment')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });

  describe('GET /guides/:guideId/improvement-suggestions', () => {
    it('should get improvement suggestions with valid authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/guides/test-guide-1/improvement-suggestions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { suggestions: [] }
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/guides/test-guide-1/improvement-suggestions')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });

  describe('GET /supported-languages', () => {
    it('should get supported languages with valid authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/supported-languages')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [{ code: 'es', name: 'Spanish' }]
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/supported-languages')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });

  describe('GET /supported-formats', () => {
    it('should get supported formats with valid authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/supported-formats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [{ format: 'pdf', name: 'PDF' }]
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/ai-enhancement/supported-formats')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required'
      });
    });
  });
});