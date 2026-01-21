import { Request, Response } from 'express';
import { User } from '../models/User';
import { publishRealtime } from '../utils/realtime';
import { ProfileField } from '../models/ProfileField';

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    
    // Build allowed keys from static list + admin-defined profile fields
    const staticAllowed = [
      'name',
      'email',
      'phone',
      'phoneNumber',
      'whatsappNumber',
      'telegramId',
      'telegramUsername',
      'location',
      'bio',
      'skills',
      'batch',
      'notificationPrefs',
    ];
    const profileFieldKeys = (await ProfileField.distinct('key')) || [];
    const allowed = Array.from(new Set([...staticAllowed, ...profileFieldKeys]));
    
    const payload: any = {};
    for (const key of allowed) {
      if (key in updates) {
        payload[key] = updates[key];
      }
    }

    const user = await User.findByIdAndUpdate(id, payload, { new: true }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    try {
      publishRealtime('realtime:users', { type: 'user_updated', userId: user._id, user });
    } catch (e) {
      // ignore
    }
    
    return res.json(user);
  } catch (err: any) {
    console.error('updateUser error', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err: any) {
    console.error('getUser error', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};
