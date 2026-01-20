import express from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user preferences
router.get('/preferences', authenticateToken, notificationController.getPreferences);

// Update preferences (including contact details)
router.put('/preferences', authenticateToken, notificationController.updatePreferencesWithContacts);

// Get notification history
router.get('/history', authenticateToken, notificationController.getNotificationHistory);

// Send test notification
router.post('/test', authenticateToken, notificationController.testNotification);

// Get notification statistics
router.get('/stats', authenticateToken, notificationController.getNotificationStats);

// Update notification preferences (legacy endpoint)
router.put('/update-preferences', authenticateToken, notificationController.updateNotificationPreferences);

// Send notification (admin)
router.post('/send', authenticateToken, notificationController.sendNotification);

export default router;
