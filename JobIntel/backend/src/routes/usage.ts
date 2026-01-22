import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { canPerformAction, recordAction, getUsageStats } from '../controllers/usageController';

const router = Router();

// Check if user can perform action
router.get('/can-action/:jobId/:actionType', authenticateToken, canPerformAction);

// Log an action
router.post('/log-action', authenticateToken, recordAction);

// Get user's usage stats
router.get('/stats', authenticateToken, getUsageStats);

export default router;
