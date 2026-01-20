import { Router } from 'express';
import {
  getNotifications,
  createNotification,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
  markAllAsRead,
} from '../controllers/notificationCrudController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all notifications for the user
router.get('/', getNotifications);

// Create a notification (internal use)
router.post('/', createNotification);

// Mark a notification as read
router.post('/:id/read', markAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

// Mark all notifications as read
router.post('/all/read', markAllAsRead);

// Delete all notifications
router.delete('/all/delete', deleteAllNotifications);

export default router;
