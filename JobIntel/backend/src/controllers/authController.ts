import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import dotenv from 'dotenv';

// Ensure env is loaded
if (!process.env.JWT_SECRET) {
  dotenv.config();
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_9f3a2b4c';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_xyz';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRY || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRY || '30d';

function signAccessToken(user: any) {
  return jwt.sign(
    { 
      sub: user._id,
      userId: user._id, 
      role: user.roles?.[0] || 'user',
      roles: user.roles || ['user']
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function signRefreshToken(user: any) {
  return jwt.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      passwordHash: hash,
      name,
      roles: ['user'],
    });

    logger.info(`User registered: ${email}`);

    // Generate tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.status(201).json({
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    logger.error(err, { context: 'register' });
    return res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logger.warn(`Failed login attempt for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    logger.info(`User logged in: ${email}`);

    return res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    });
  } catch (err) {
    logger.error(err, { context: 'login' });
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    logger.warn(`Invalid refresh token attempted`);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  try {
    logger.info(`User logged out: ${req.userId}`);
    return res.json({ message: 'Logout successful' });
  } catch (err) {
    logger.error(err, { context: 'logout' });
    return res.status(500).json({ error: 'Logout failed' });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    logger.info(`Password changed for user: ${req.userId}`);

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error(err, { context: 'changePassword' });
    return res.status(500).json({ error: 'Change password failed' });
  }
}

export async function verifyToken(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    });
  } catch (err) {
    logger.error(err, { context: 'verifyToken' });
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId || (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      phone,
      phoneNumber,
      whatsappNumber,
      telegramId,
      telegramUsername,
      location,
      bio,
      skills,
      notificationPrefs,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
    if (telegramId !== undefined) updateData.telegramId = telegramId;
    if (telegramUsername !== undefined) updateData.telegramUsername = telegramUsername;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    if (skills && Array.isArray(skills)) updateData.skills = skills;
    if (notificationPrefs !== undefined) updateData.notificationPrefs = notificationPrefs;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Profile updated for user: ${userId}`);

    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        phoneNumber: user.phoneNumber,
        whatsappNumber: user.whatsappNumber,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        location: user.location,
        bio: user.bio,
        skills: user.skills,
        notificationPrefs: user.notificationPrefs,
      },
    });
  } catch (err) {
    logger.error(err, { context: 'updateProfile' });
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}
