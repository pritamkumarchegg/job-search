import { UsageTracking } from '../models/UsageTracking';
import { User } from '../models/User';
import mongoose from 'mongoose';

const ROLLING_WINDOW_DAYS = 15;
const FREE_TIER_LIMIT_PER_WINDOW = 1; // 1 action per 15 days

export interface ActionPermission {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  resetDate?: Date;
}

/**
 * Check if a user can perform an action (apply/viewDetails) on a job
 */
export async function checkActionPermission(
  userId: string,
  jobId: string,
  actionType: 'apply' | 'viewDetails',
  ipAddress?: string
): Promise<ActionPermission> {
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Premium users can always perform actions
    if (user.tier === 'premium') {
      return { allowed: true };
    }

    // Free users: check 15-day rolling window
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - ROLLING_WINDOW_DAYS);

    // Count actions in the rolling window
    const recentActions = await UsageTracking.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: fifteenDaysAgo },
    });

    if (recentActions >= FREE_TIER_LIMIT_PER_WINDOW) {
      // Find when the oldest action was to calculate reset date
      const oldestAction = await UsageTracking.findOne(
        { userId: new mongoose.Types.ObjectId(userId) },
        { timestamp: 1 },
        { sort: { timestamp: 1 } }
      );

      const resetDate = oldestAction
        ? new Date(oldestAction.timestamp.getTime() + ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      return {
        allowed: false,
        reason: `You've used your free limit. Upgrade to Premium for unlimited access or try again on ${resetDate.toLocaleDateString()}`,
        remaining: 0,
        resetDate,
      };
    }

    return {
      allowed: true,
      remaining: FREE_TIER_LIMIT_PER_WINDOW - recentActions,
    };
  } catch (err) {
    console.error('checkActionPermission error:', err);
    return { allowed: false, reason: 'Permission check failed' };
  }
}

/**
 * Log an action when a user performs it
 */
export async function logAction(
  userId: string,
  jobId: string,
  actionType: 'apply' | 'viewDetails',
  ipAddress?: string
): Promise<boolean> {
  try {
    await UsageTracking.create({
      userId: new mongoose.Types.ObjectId(userId),
      jobId: new mongoose.Types.ObjectId(jobId),
      actionType,
      timestamp: new Date(),
      ipAddress,
    });
    return true;
  } catch (err) {
    console.error('logAction error:', err);
    return false;
  }
}

/**
 * Get usage stats for a user (for display on frontend)
 */
export async function getUserUsageStats(userId: string) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    // Premium users have no limits
    if (user.tier === 'premium') {
      return {
        tier: 'premium',
        usedActions: 0,
        maxActions: Infinity,
        remaining: Infinity,
        resetDate: null,
      };
    }

    // Free users: check 15-day rolling window
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - ROLLING_WINDOW_DAYS);

    const recentActions = await UsageTracking.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: fifteenDaysAgo },
    });

    const oldestAction = await UsageTracking.findOne(
      {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: fifteenDaysAgo },
      },
      { timestamp: 1 },
      { sort: { timestamp: 1 } }
    );

    const resetDate = oldestAction
      ? new Date(oldestAction.timestamp.getTime() + ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      : null;

    return {
      tier: 'free',
      usedActions: recentActions,
      maxActions: FREE_TIER_LIMIT_PER_WINDOW,
      remaining: Math.max(0, FREE_TIER_LIMIT_PER_WINDOW - recentActions),
      resetDate,
    };
  } catch (err) {
    console.error('getUserUsageStats error:', err);
    return null;
  }
}
