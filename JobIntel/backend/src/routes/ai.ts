import express from 'express';
import { parseJobController, matchController, coverController } from '../controllers/aiController';
import { aiMatchingController } from '../controllers/aiMatchingController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Existing AI endpoints
router.post('/parse', parseJobController);
router.post('/match', matchController);
router.post('/cover', coverController);

// NEW: AI Job Matching Endpoints
// Public endpoints (require authentication)
router.get('/best-fit-jobs/:userId', /* authenticateToken, */ (req, res) => aiMatchingController.getBestFitJobs(req, res, () => {}));
router.post('/analyze-resume', authenticateToken, (req, res) => aiMatchingController.analyzeResume(req, res, () => {}));
router.post('/trigger-matching/:userId', /* authenticateToken, */ (req, res) => aiMatchingController.triggerMatching(req, res, () => {}));
router.get('/match-details/:userId/:jobId', authenticateToken, (req, res) => aiMatchingController.getMatchDetails(req, res, () => {}));
router.get('/my-matches/:userId', authenticateToken, (req, res) => aiMatchingController.getMyMatches(req, res, () => {}));

// Admin endpoints
router.post('/trigger-job-matching/:jobId', authenticateToken, (req, res) => aiMatchingController.triggerJobMatching(req, res, () => {}));
router.get('/matching-stats', authenticateToken, (req, res) => aiMatchingController.getMatchingStats(req, res, () => {}));
router.post('/match-all-jobs', authenticateToken, (req, res) => aiMatchingController.matchAllJobs(req, res, () => {}));
router.post('/cleanup-matches', authenticateToken, (req, res) => aiMatchingController.cleanupMatches(req, res, () => {}));

export default router;
