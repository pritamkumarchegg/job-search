import { Router } from 'express';
import {
  getMessages,
  getMessage,
  sendMessage,
  replyToMessage,
  markMessageAsRead,
  deleteMessage,
} from '../controllers/messageCrudController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all messages for the user
router.get('/', getMessages);

// Get a specific message
router.get('/:id', getMessage);

// Send a new message
router.post('/', sendMessage);

// Reply to a message
router.post('/:id/reply', replyToMessage);

// Mark a message as read
router.post('/:id/read', markMessageAsRead);

// Delete a message
router.delete('/:id', deleteMessage);

export default router;
