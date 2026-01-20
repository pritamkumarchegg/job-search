import { Router } from 'express';
import {
  getMatchedJobs,
  getMatchDetails,
  getMatchingStats,
  triggerMatching,
  updateMatchStatus,
  getRecommendations,
} from '../controllers/matchingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All matching routes require authentication
router.use(authenticateToken);

/**
 * GET /api/matching/my-jobs
 * Get user's matched jobs
 */
router.get('/my-jobs', getMatchedJobs);

/**
 * GET /api/matching/my-jobs/:matchId
 * Get detailed match information
 */
router.get('/my-jobs/:matchId', getMatchDetails);

/**
 * GET /api/matching/statistics
 * Get user's matching statistics
 */
router.get('/statistics', getMatchingStats);

/**
 * POST /api/matching/trigger-match
 * Manually trigger matching (after resume upload)
 */
router.post('/trigger-match', triggerMatching);

/**
 * PUT /api/matching/my-jobs/:matchId/status
 * Update match status
 */
router.put('/my-jobs/:matchId/status', updateMatchStatus);

/**
 * GET /api/matching/recommendations
 * Get AI recommendations based on matches
 */
router.get('/recommendations', getRecommendations);

export default router;
