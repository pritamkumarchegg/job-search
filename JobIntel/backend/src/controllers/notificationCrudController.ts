import { Request, Response } from 'express';
import Notification from '../models/Notification';

// Get all notifications for a user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json(notifications);
  } catch (err: any) {
    console.error('getNotifications error', err);
    return res.status(500).json({ error: err?.message || 'Failed to get notifications' });
  }
};

// Create a notification (internal use)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, type, title, message, link, metadata } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      metadata,
      read: false,
    });

    return res.status(201).json(notification);
  } catch (err: any) {
    console.error('createNotification error', err);
    return res.status(500).json({ error: err?.message || 'Failed to create notification' });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json(notification);
  } catch (err: any) {
    console.error('markAsRead error', err);
    return res.status(500).json({ error: err?.message || 'Failed to mark as read' });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('deleteNotification error', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete notification' });
  }
};

// Delete all notifications for a user
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Notification.deleteMany({ userId });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('deleteAllNotifications error', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete notifications' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Notification.updateMany({ userId, read: false }, { read: true });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('markAllAsRead error', err);
    return res.status(500).json({ error: err?.message || 'Failed to mark all as read' });
  }
};
