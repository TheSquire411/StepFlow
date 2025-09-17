import { Router } from 'express';
import { AIEnhancementController } from '../controllers/ai-enhancement.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
const aiEnhancementController = new AIEnhancementController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/ai-enhancement/guides/:guideId/summarize
 * @desc Generate a concise summary of a guide
 * @access Private
 */
router.post('/guides/:guideId/summarize', (req, res) => {
  aiEnhancementController.summarizeGuide(req, res);
});

/**
 * @route POST /api/ai-enhancement/guides/:guideId/convert
 * @desc Convert guide to different format (PDF, HTML, Markdown, etc.)
 * @access Private
 */
router.post('/guides/:guideId/convert', (req, res) => {
  aiEnhancementController.convertGuideFormat(req, res);
});

/**
 * @route POST /api/ai-enhancement/guides/:guideId/translate
 * @desc Translate guide to different language
 * @access Private
 */
router.post('/guides/:guideId/translate', (req, res) => {
  aiEnhancementController.translateGuide(req, res);
});

/**
 * @route GET /api/ai-enhancement/guides/:guideId/quality-assessment
 * @desc Assess content quality and get improvement suggestions
 * @access Private
 */
router.get('/guides/:guideId/quality-assessment', (req, res) => {
  aiEnhancementController.assessContentQuality(req, res);
});

/**
 * @route GET /api/ai-enhancement/guides/:guideId/improvement-suggestions
 * @desc Get specific improvement suggestions for a guide
 * @access Private
 */
router.get('/guides/:guideId/improvement-suggestions', (req, res) => {
  aiEnhancementController.getImprovementSuggestions(req, res);
});

/**
 * @route GET /api/ai-enhancement/supported-languages
 * @desc Get list of supported languages for translation
 * @access Private
 */
router.get('/supported-languages', (req, res) => {
  aiEnhancementController.getSupportedLanguages(req, res);
});

/**
 * @route GET /api/ai-enhancement/supported-formats
 * @desc Get list of supported export formats
 * @access Private
 */
router.get('/supported-formats', (req, res) => {
  aiEnhancementController.getSupportedFormats(req, res);
});

export default router;