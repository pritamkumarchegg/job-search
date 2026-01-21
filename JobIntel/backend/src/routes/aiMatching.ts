import { Router, Request, Response } from 'express';
import { aiMatchingController } from '../controllers/aiMatchingController';
import { authenticateToken } from '../middleware/auth';

/**
 * AI Matching Routes
 * All endpoints for AI-powered job matching system
 */
const router = Router();

/**
 * PUBLIC ENDPOINTS
 * User-facing matching features
 */

/**
 * GET /api/ai/best-fit-jobs/:userId
 * Get the best-fit jobs for a specific user
 * Query params:
 *   - limit: number (default: 10, max: 50)
 * Response: JobMatchScore[]
 */
router.get(
  '/best-fit-jobs/:userId',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.getBestFitJobs(req, res, () => {})
);

/**
 * POST /api/ai/analyze-resume
 * Analyze a user's resume and extract AI profile
 * Body:
 *   - userId: string (required)
 *   - resumeText: string (required, min 100 chars)
 * Response: AIProfile
 */
router.post(
  '/analyze-resume',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.analyzeResume(req, res, () => {})
);

/**
 * POST /api/ai/trigger-matching/:userId
 * Manually trigger matching process for a user
 * Params:
 *   - userId: string (required)
 * Response: top matches
 */
router.post(
  '/trigger-matching/:userId',
  // authenticateToken, // Temporarily disabled for testing
  (req: Request, res: Response) => aiMatchingController.triggerMatching(req, res, () => {})
);

/**
 * GET /api/ai/match-details/:userId/:jobId
 * Get detailed match analysis for a specific job
 * Params:
 *   - userId: string (required)
 *   - jobId: string (required)
 * Response: JobMatchScore with detailed analysis
 */
router.get(
  '/match-details/:userId/:jobId',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.getMatchDetails(req, res, () => {})
);

/**
 * GET /api/ai/my-matches/:userId
 * Get all saved matches for a user
 * Query params:
 *   - limit: number (default: 50, max: 100)
 * Response: JobMatchScore[]
 */
router.get(
  '/my-matches/:userId',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.getMyMatches(req, res, () => {})
);

/**
 * ADMIN ENDPOINTS
 * System management and batch operations
 */

/**
 * POST /api/ai/trigger-job-matching/:jobId
 * Admin: Trigger matching for a new job against all users
 * Params:
 *   - jobId: string (required)
 * Auth: Admin only
 * Response: matching statistics
 */
router.post(
  '/trigger-job-matching/:jobId',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.triggerJobMatching(req, res, () => {})
);

/**
 * GET /api/ai/matching-stats
 * Get system statistics for AI matching
 * Response: {
 *   totalJobs: number,
 *   totalUsers: number,
 *   totalMatches: number,
 *   averageMatchScore: number,
 *   topMatches: JobMatchScore[]
 * }
 */
router.get(
  '/matching-stats',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.getMatchingStats(req, res, () => {})
);

/**
 * POST /api/ai/match-all-jobs
 * Admin: Trigger batch matching for ALL jobs against ALL users (background operation)
 * Note: This is a long-running operation and returns immediately
 * Auth: Admin only
 * Response: batch operation started
 */
router.post(
  '/match-all-jobs',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.matchAllJobs(req, res, () => {})
);

/**
 * POST /api/ai/cleanup-matches
 * Admin: Cleanup old matches (older than 30 days)
 * Auth: Admin only
 * Response: number of deleted matches
 */
router.post(
  '/cleanup-matches',
  authenticateToken,
  (req: Request, res: Response) => aiMatchingController.cleanupMatches(req, res, () => {})
);

// Error handling middleware
router.use((error: any, req: Request, res: Response) => {
  console.error(`[aiMatching Route Error] ${error.message}`);

  // OpenAI rate limit error
  if (error.message.includes('429') || error.message.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again in a few moments.',
      retryAfter: 60,
    });
  }

  // OpenAI authentication error
  if (error.message.includes('401') || error.message.includes('authentication')) {
    return res.status(500).json({
      success: false,
      error: 'AI service authentication error',
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

export default router;
