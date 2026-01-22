import { UsageTracking } from '../models/UsageTracking';
import { User } from '../models/User';
import { AdminSettings } from '../models/AdminSettings';
import mongoose from 'mongoose';

// Default constants
const DEFAULT_ROLLING_WINDOW_DAYS = 15;
const FREE_TIER_LIMIT_PER_WINDOW = 1; // 1 action per window

export interface ActionPermission {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  resetDate?: Date;
}

/**
 * Get rolling window days from admin settings
 */
async function getRollingWindowDays(): Promise<number> {
  try {
    const setting = await AdminSettings.findOne({ key: 'premium_lock_days' });
    return setting ? parseInt(setting.value) || DEFAULT_ROLLING_WINDOW_DAYS : DEFAULT_ROLLING_WINDOW_DAYS;
  } catch (err) {
    console.error('getRollingWindowDays error:', err);
    return DEFAULT_ROLLING_WINDOW_DAYS;
  }
}

/**
 * Check if premium lock is enabled
 */
async function isPremiumLockEnabled(): Promise<boolean> {
  try {
    const setting = await AdminSettings.findOne({ key: 'premium_lock_enabled' });
    return setting ? setting.value !== false : true; // Default to true
  } catch (err) {
    console.error('isPremiumLockEnabled error:', err);
    return true;
  }
}

/**
 * Check if user is manually granted premium access
 */
async function isManualPremiumUser(userEmail: string): Promise<boolean> {
  try {
    const setting = await AdminSettings.findOne({ key: 'manual_premium_users' });
    if (!setting) return false;
    const users = Array.isArray(setting.value) ? setting.value : [];
    return users.some((u: string) => u.toLowerCase() === userEmail.toLowerCase());
  } catch (err) {
    console.error('isManualPremiumUser error:', err);
    return false;
  }
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

    // Check if premium lock is enabled
    const lockEnabled = await isPremiumLockEnabled();
    if (!lockEnabled) {
      return { allowed: true }; // No restrictions if lock is disabled
    }

    // Premium users can always perform actions
    if (user.tier === 'premium') {
      return { allowed: true };
    }

    // Check if user is manually granted premium
    const isManualPremium = await isManualPremiumUser(user.email || '');
    if (isManualPremium) {
      return { allowed: true };
    }

    // Free users: check rolling window
    const rollingWindowDays = await getRollingWindowDays();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - rollingWindowDays);

    // Count actions in the rolling window
    const recentActions = await UsageTracking.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: windowStart },
    });

    if (recentActions >= FREE_TIER_LIMIT_PER_WINDOW) {
      // Find when the oldest action was to calculate reset date
      const oldestAction = await UsageTracking.findOne(
        { userId: new mongoose.Types.ObjectId(userId) },
        { timestamp: 1 },
        { sort: { timestamp: 1 } }
      );

      const resetDate = oldestAction
        ? new Date(oldestAction.timestamp.getTime() + rollingWindowDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + rollingWindowDays * 24 * 60 * 60 * 1000);

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

    // Check if premium lock is enabled
    const lockEnabled = await isPremiumLockEnabled();

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

    // Check if user is manually granted premium
    const isManualPremium = await isManualPremiumUser(user.email || '');
    if (isManualPremium) {
      return {
        tier: 'premium',
        usedActions: 0,
        maxActions: Infinity,
        remaining: Infinity,
        resetDate: null,
      };
    }

    // If lock is disabled, free users have unlimited access
    if (!lockEnabled) {
      return {
        tier: 'free',
        usedActions: 0,
        maxActions: Infinity,
        remaining: Infinity,
        resetDate: null,
      };
    }

    // Free users: check rolling window
    const rollingWindowDays = await getRollingWindowDays();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - rollingWindowDays);

    const recentActions = await UsageTracking.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: windowStart },
    });

    const oldestAction = await UsageTracking.findOne(
      {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: windowStart },
      },
      { timestamp: 1 },
      { sort: { timestamp: 1 } }
    );

    const resetDate = oldestAction
      ? new Date(oldestAction.timestamp.getTime() + rollingWindowDays * 24 * 60 * 60 * 1000)
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
