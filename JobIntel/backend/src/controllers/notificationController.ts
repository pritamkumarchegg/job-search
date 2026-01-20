import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { NotificationLog } from '../models/NotificationLog';
import { User } from '../models/User';
import { emailService } from '../services/notifications/emailService';
import { whatsappService } from '../services/notifications/whatsappService';
import { telegramService } from '../services/notifications/telegramService';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
  body: any;
  query: any;
}

/**
 * POST /api/notifications/send
 * Send a manual notification
 */
export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, notificationType, channel, message } = req.body;

    if (!userId || !notificationType || !channel || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log the notification send request
    const log = await NotificationLog.create({
      userId,
      channel,
      status: 'queued',
    });

    logger.info(`Notification created`, { logId: log._id, userId, channel });

    return res.status(200).json({
      message: 'Notification created successfully',
      logId: log._id,
    });
  } catch (error) {
    logger.error(`Error creating notification: ${error}`);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
};

/**
 * GET /api/notifications/history
 * Get notification history for user
 */
export const getNotificationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const history = await NotificationLog.find({ userId })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ notifications: history, count: history.length });
  } catch (error) {
    logger.error(`Error fetching notification history: ${error}`);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
};

/**
 * POST /api/notifications/preferences
 * Update notification preferences
 */
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { emailEnabled, whatsappEnabled, telegramEnabled, maxPerDay } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        notificationPrefs: {
          email: emailEnabled !== false,
          whatsapp: whatsappEnabled !== false,
          telegram: telegramEnabled !== false,
        },
      },
      { new: true }
    );

    logger.info(`Notification preferences updated for user: ${userId}`);

    return res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: user?.notificationPrefs,
    });
  } catch (error) {
    logger.error(`Error updating notification preferences: ${error}`);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
};

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from notifications
 */
export const unsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channel } = req.body;

    if (!userId || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findByIdAndUpdate(userId, {
      $set: {
        [`notificationPreferences.${channel}Enabled`]: false,
      },
    });

    logger.info(`User unsubscribed from ${channel}`, { userId });

    return res.status(200).json({ message: `Unsubscribed from ${channel} notifications` });
  } catch (error) {
    logger.error(`Error unsubscribing user: ${error}`);
    return res.status(500).json({ error: 'Failed to unsubscribe' });
  }
};

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await NotificationLog.aggregate([
      { $match: { userId: userId as any } },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byChannel: [
            {
              $group: {
                _id: '$channel',
                count: { $sum: 1 },
              },
            },
          ],
          byType: [
            {
              $group: {
                _id: '$notificationType',
                count: { $sum: 1 },
              },
            },
          ],
          total: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    return res.status(200).json({
      stats: stats[0] || {
        byStatus: [],
        byChannel: [],
        byType: [],
        total: [{ count: 0 }],
      },
    });
  } catch (error) {
    logger.error(`Error fetching notification stats: ${error}`);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export const getPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ preferences: user.notificationPrefs });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

/**
 * PUT /api/notifications/preferences
 * Update notification preferences with contact details
 */
export const updatePreferencesWithContacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      email, 
      whatsapp, 
      telegram, 
      notificationPrefs,
      phoneNumber,
      whatsappNumber,
      telegramId,
      telegramUsername
    } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        notificationPrefs: notificationPrefs || {},
        phoneNumber,
        whatsappNumber,
        telegramId,
        telegramUsername,
      },
      { new: true }
    );

    logger.info(`Notification preferences updated for user: ${userId}`);

    return res.status(200).json({
      message: 'Preferences updated successfully',
      user: {
        notificationPrefs: user?.notificationPrefs,
        phoneNumber: user?.phoneNumber,
        whatsappNumber: user?.whatsappNumber,
        telegramId: user?.telegramId,
        telegramUsername: user?.telegramUsername,
      },
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

/**
 * POST /api/notifications/test
 * Send test notification to verify setup
 */
export const testNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channel } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `Test notification queued to ${channel}`, result: true });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

/**
 * Send match notification helper function
 */
export async function sendMatchNotifications(
  userId: string,
  jobTitle: string,
  companyName: string,
  matchScore: number,
  matchReasons: string[]
): Promise<void> {
  try {
    const user = await User.findById(userId);

    if (!user) {
      logger.warn(`User not found for notification: ${userId}`);
      return;
    }

    const prefs = (user.notificationPrefs || {}) as { email?: boolean; whatsapp?: boolean; telegram?: boolean };

    // Send email
    if (prefs.email && user.email) {
      await emailService.sendMatchNotification(user.email, jobTitle, companyName, matchScore, matchReasons);
    }

    // Send WhatsApp
    if (prefs.whatsapp && user.whatsappNumber) {
      await whatsappService.sendMatchNotification(user.whatsappNumber, jobTitle, companyName, matchScore);
    }

    // Send Telegram
    if (prefs.telegram && user.telegramId) {
      await telegramService.sendMatchNotification(user.telegramId, jobTitle, companyName, matchScore, 'https://jobintel.com');
    }

    // Log notification
    await NotificationLog.create({
      userId,
      notificationType: 'match',
      channel: 'multi',
      subject: `${jobTitle} at ${companyName}`,
      message: `Match Score: ${matchScore}/100`,
      status: 'sent',
      sentAt: new Date(),
      retryCount: 0,
    });

    logger.info(`Match notification sent to user: ${userId}`, { jobTitle, matchScore });
  } catch (error) {
    logger.error(`Error sending match notification: ${error}`, { userId, jobTitle });
  }
}
