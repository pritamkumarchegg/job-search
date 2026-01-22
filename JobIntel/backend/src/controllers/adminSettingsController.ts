import { Request, Response } from 'express';
import { Skill } from '../models/Skill';
import { ProfileField } from '../models/ProfileField';
import { AdminSettings } from '../models/AdminSettings';
import { User } from '../models/User';
import publishRealtime from '../utils/realtime';

// Skills CRUD
export const listAdminSkills = async (_req: Request, res: Response) => {
  try {
    const items = await Skill.find().sort({ name: 1 }).lean();
    return res.json(items);
  } catch (err: any) {
    console.error('listAdminSkills', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const createAdminSkill = async (req: Request, res: Response) => {
  try {
    const { name, custom = true } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const existing = await Skill.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ error: 'skill already exists' });
    const skill = await Skill.create({ name: String(name).trim(), custom });
    publishRealtime('realtime:skills', { type: 'skills', action: 'create', skill });
    return res.status(201).json(skill);
  } catch (err: any) {
    console.error('createAdminSkill', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const deleteAdminSkill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await Skill.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    publishRealtime('realtime:skills', { type: 'skills', action: 'delete', id });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('deleteAdminSkill', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

// Profile Fields CRUD
export const listProfileFields = async (_req: Request, res: Response) => {
  try {
    const items = await ProfileField.find().sort({ createdAt: 1 }).lean();
    return res.json(items);
  } catch (err: any) {
    console.error('listProfileFields', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const createProfileField = async (req: Request, res: Response) => {
  try {
    const { key, label, type = 'text', required = false, options = [] } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'key and label required' });
    const existing = await ProfileField.findOne({ key });
    if (existing) return res.status(409).json({ error: 'field key already exists' });
    const field = await ProfileField.create({ key, label, type, required, options });
    publishRealtime('realtime:profile_fields', { type: 'profile_fields', action: 'create', field });
    return res.status(201).json(field);
  } catch (err: any) {
    console.error('createProfileField', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const updateProfileField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const field = await ProfileField.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!field) return res.status(404).json({ error: 'not found' });
    publishRealtime('realtime:profile_fields', { type: 'profile_fields', action: 'update', field });
    return res.json(field);
  } catch (err: any) {
    console.error('updateProfileField', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const deleteProfileField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await ProfileField.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    publishRealtime('realtime:profile_fields', { type: 'profile_fields', action: 'delete', id });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('deleteProfileField', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

// Admin Settings CRUD
export const getAllSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await AdminSettings.find().lean();
    const settingsMap = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    return res.json(settingsMap);
  } catch (err: any) {
    console.error('getAllSettings', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const getSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await AdminSettings.findOne({ key }).lean();
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    return res.json(setting);
  } catch (err: any) {
    console.error('getSetting', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, type = 'string', description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value required' });
    }

    const setting = await AdminSettings.findOneAndUpdate(
      { key },
      {
        value,
        type,
        description,
        updatedBy: (req as any).user?._id,
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    publishRealtime('realtime:admin_settings', {
      type: 'admin_settings',
      action: 'update',
      key,
      value,
    });

    return res.json(setting);
  } catch (err: any) {
    console.error('updateSetting', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

export const deleteSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const doc = await AdminSettings.findOneAndDelete({ key });
    if (!doc) return res.status(404).json({ error: 'not found' });

    publishRealtime('realtime:admin_settings', {
      type: 'admin_settings',
      action: 'delete',
      key,
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('deleteSetting', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

/**
 * Grant manual premium access to a user by email
 */
export const grantManualPremium = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }

    // Find user by email
    const user = await User.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    // Add to manual premium list
    const setting = await AdminSettings.findOneAndUpdate(
      { key: 'manual_premium_users' },
      {
        $addToSet: { value: email.toLowerCase() }
      },
      { new: true, upsert: true }
    );

    // If user is free tier, upgrade them to premium
    if (user.tier === 'free') {
      user.tier = 'premium';
      await user.save();
    }

    publishRealtime('realtime:admin_settings', {
      type: 'admin_settings',
      action: 'grant_manual_premium',
      email,
      userId: user._id,
    });

    return res.json({ 
      success: true, 
      message: `User ${email} granted premium access`,
      user: {
        id: user._id,
        email: user.email,
        tier: user.tier,
      }
    });
  } catch (err: any) {
    console.error('grantManualPremium', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

/**
 * Search users by email or name for autocomplete
 */
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
    console.error('searchUsers', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};

/**
 * Revoke manual premium access from a user by email
 */
export const revokeManualPremium = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }

    // Remove from manual premium list
    const setting = await AdminSettings.findOneAndUpdate(
      { key: 'manual_premium_users' },
      {
        $pull: { value: email.toLowerCase() }
      },
      { new: true }
    );

    publishRealtime('realtime:admin_settings', {
      type: 'admin_settings',
      action: 'revoke_manual_premium',
      email,
    });

    return res.json({ 
      success: true, 
      message: `User ${email} manual premium access revoked`
    });
  } catch (err: any) {
    console.error('revokeManualPremium', err);
    return res.status(500).json({ error: err?.message || 'server error' });
  }
};
