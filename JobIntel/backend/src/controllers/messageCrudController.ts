import { Request, Response } from 'express';
import Message from '../models/Message';

// Get messages for the authenticated user (as recipient)
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await Message.find({ recipientId: userId })
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json(messages);
  } catch (err: any) {
    console.error('getMessages error', err);
    return res.status(500).json({ error: err?.message || 'Failed to get messages' });
  }
};

// Get a specific message
export const getMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const messageId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await Message.findOne({
      _id: messageId,
      recipientId: userId,
    })
      .populate('senderId', 'name email')
      .populate('replies.senderId', 'name email');

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read if unread
    if (!message.read) {
      message.read = true;
      await message.save();
    }

    return res.json(message);
  } catch (err: any) {
    console.error('getMessage error', err);
    return res.status(500).json({ error: err?.message || 'Failed to get message' });
  }
};

// Create a message (send from one user to another)
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { recipientId, subject, body } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!recipientId || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = await Message.create({
      senderId: userId,
      recipientId,
      subject,
      body,
      read: false,
    });

    return res.status(201).json(message);
  } catch (err: any) {
    console.error('sendMessage error', err);
    return res.status(500).json({ error: err?.message || 'Failed to send message' });
  }
};

// Reply to a message
export const replyToMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const messageId = req.params.id;
    const { body } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!body) {
      return res.status(400).json({ error: 'Reply body is required' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Add reply to the message
    if (!message.replies) {
      message.replies = [];
    }

    message.replies.push({
      senderId: userId,
      body,
      createdAt: new Date(),
    });

    await message.save();

    return res.json(message);
  } catch (err: any) {
    console.error('replyToMessage error', err);
    return res.status(500).json({ error: err?.message || 'Failed to reply to message' });
  }
};

// Mark a message as read
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const messageId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await Message.findOneAndUpdate(
      { _id: messageId, recipientId: userId },
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.json(message);
  } catch (err: any) {
    console.error('markMessageAsRead error', err);
    return res.status(500).json({ error: err?.message || 'Failed to mark as read' });
  }
};

// Delete a message
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const messageId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await Message.findOneAndDelete({
      _id: messageId,
      recipientId: userId,
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('deleteMessage error', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete message' });
  }
};
