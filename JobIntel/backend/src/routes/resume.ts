import { Router } from 'express';
import { resumeUpload, handleResumeUploadError } from '../middleware/resumeUpload';
import {
  uploadResume,
  getResume,
  deleteResume,
  getResumeMatches,
  getResumeStats,
  reMatchResume,
} from '../controllers/resumeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All resume routes require authentication
router.use(authenticateToken);

/**
 * POST /api/resume/upload
 * Upload and parse a resume file
 */
router.post(
  '/upload',
  resumeUpload.single('file'),
  handleResumeUploadError,
  uploadResume
);

/**
 * GET /api/resume
 * Get current user's parsed resume
 */
router.get('/', getResume);

/**
 * DELETE /api/resume
 * Delete user's resume
 */
router.delete('/', deleteResume);

/**
 * GET /api/resume/matches
 * Get top job matches for user based on resume
 */
router.get('/matches', getResumeMatches);

/**
 * GET /api/resume/stats
 * Get resume parsing and matching statistics
 */
router.get('/stats', getResumeStats);

/**
 * POST /api/resume/re-match
 * Trigger re-matching for user
 */
router.post('/re-match', reMatchResume);

export default router;
