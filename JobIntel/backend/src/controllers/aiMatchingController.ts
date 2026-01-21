import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { aiJobMatchingService } from '../services/aiJobMatchingService';
import { jobMatchingTriggerService } from '../services/jobMatchingTriggerService';
import { validateRequest } from '../middleware/validation';

class AIMatchingController {
  async getBestFitJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      validateRequest.checkParamExists('userId', userId);

      // Get pagination params from query
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50); // Max 100 per page
      const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : undefined; // Use admin setting if not provided
      
      const result = await aiJobMatchingService.getBestFitJobsPaginated(userId, page, limit, minScore);
      res.json({ success: true, data: result.jobs, pagination: result.pagination });
    } catch (error: any) {
      logger.error('Get best-fit jobs failed', { error: error.message });
      next(error);
    }
  }

  async analyzeResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: {} });
    } catch (error: any) {
      next(error);
    }
  }

  async triggerMatching(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      validateRequest.checkParamExists('userId', userId);
      
      const result = await aiJobMatchingService.triggerUserMatching(userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Trigger matching failed', { error: error.message });
      next(error);
    }
  }

  async getMatchDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const jobId = String(req.params.jobId);
      const match = await aiJobMatchingService.getMatchDetails(userId, jobId);
      res.json({ success: true, data: match });
    } catch (error: any) {
      next(error);
    }
  }

  async getMyMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const matches = await aiJobMatchingService.getUserMatches(userId, 50);
      res.json({ success: true, data: matches });
    } catch (error: any) {
      next(error);
    }
  }

  async triggerJobMatching(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      res.json({ success: true, data: { triggered: true, jobId } });
    } catch (error: any) {
      next(error);
    }
  }

  async getMatchingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await jobMatchingTriggerService.getMatchingStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      next(error);
    }
  }

  async matchAllJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: { started: true } });
    } catch (error: any) {
      next(error);
    }
  }

  async cleanupMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: { cleaned: 0 } });
    } catch (error: any) {
      next(error);
    }
  }
}

export const aiMatchingController = new AIMatchingController();
