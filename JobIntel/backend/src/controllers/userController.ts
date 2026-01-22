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
    
    // Convert skillsRating Map to plain object if needed
    const userData = {
      ...user,
      skillsRating: user.skillsRating instanceof Map 
        ? Object.fromEntries(user.skillsRating)
        : (user.skillsRating || {})
    };
    
    console.log('[UserController] getUser response:', { 
      userId: userData._id, 
      skillsRatingKeys: typeof userData.skillsRating === 'object' ? Object.keys(userData.skillsRating).length : 0 
    });
    
    return res.json(userData);
  } catch (err: any) {
    console.error('getUser error', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    // Search by email or name
    const users = await User.find(
      {
        $or: [
          { email: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } }
        ]
      },
      { email: 1, name: 1, tier: 1 }
    )
      .limit(10)
      .lean();

    return res.json(users);
  } catch (err: any) {
    console.error('searchUsers error', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};
