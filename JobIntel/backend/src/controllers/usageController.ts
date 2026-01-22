import { Request, Response } from 'express';
import { checkActionPermission, logAction, getUserUsageStats } from '../services/usageTrackingService';
import { AuthRequest } from '../middleware/auth';

/**
 * Check if user can perform an action (apply/view details)
 * GET /api/usage/can-action/:jobId/:actionType
 */
export async function canPerformAction(req: AuthRequest, res: Response) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const jobId = String(req.params.jobId || '');
    const actionType = String(req.params.actionType || '');
    if (!jobId || !actionType || !['apply', 'viewDetails'].includes(actionType)) {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    const ipAddr = (req as Request).ip as any;
    const ipAddress: string | undefined = Array.isArray(ipAddr) ? ipAddr[0] : (typeof ipAddr === 'string' ? ipAddr : undefined);
    const permission = await checkActionPermission(user._id, jobId, actionType as 'apply' | 'viewDetails', ipAddress);

    return res.json(permission);
  } catch (err) {
    console.error('canPerformAction error:', err);
    return res.status(500).json({ error: String(err) });
  }
}

/**
 * Log an action when user performs it (apply/view details)
 * POST /api/usage/log-action
 */
export async function recordAction(req: AuthRequest, res: Response) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const jobId = String(req.body.jobId || '');
    const actionType = String(req.body.actionType || '');
    if (!jobId || !actionType || !['apply', 'viewDetails'].includes(actionType)) {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    const ipAddr = (req as Request).ip as any;
    const ipAddress: string | undefined = Array.isArray(ipAddr) ? ipAddr[0] : (typeof ipAddr === 'string' ? ipAddr : undefined);

    // Check permission first
    const permission = await checkActionPermission(user._id, jobId, actionType as 'apply' | 'viewDetails', ipAddress);
    if (!permission.allowed) {
      return res.status(403).json(permission);
    }

    // Log the action
    const logged = await logAction(user._id, jobId, actionType as 'apply' | 'viewDetails', ipAddress);
    if (!logged) {
      return res.status(500).json({ error: 'Failed to record action' });
    }

    return res.json({ ok: true, message: 'Action logged successfully' });
  } catch (err) {
    console.error('recordAction error:', err);
    return res.status(500).json({ error: String(err) });
  }
}

/**
 * Get user's usage stats
 * GET /api/usage/stats
 */
export async function getUsageStats(req: AuthRequest, res: Response) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await getUserUsageStats(user._id);
    if (!stats) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(stats);
  } catch (err) {
    console.error('getUsageStats error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
