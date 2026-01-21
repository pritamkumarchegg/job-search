import { AdminSettings } from '../models/AdminSettings';

/**
 * Get a specific admin setting by key
 * @param key Setting key
 * @param defaultValue Default value if setting not found
 */
export async function getAdminSetting(key: string, defaultValue?: any): Promise<any> {
  try {
    const setting = await AdminSettings.findOne({ key }).lean();
    return setting?.value ?? defaultValue;
  } catch (error) {
    console.error('Error getting admin setting:', key, error);
    return defaultValue;
  }
}

/**
 * Get all admin settings as a key-value map
 */
export async function getAllAdminSettings(): Promise<Record<string, any>> {
  try {
    const settings = await AdminSettings.find().lean();
    return settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting all admin settings:', error);
    return {};
  }
}

/**
 * Set an admin setting
 * @param key Setting key
 * @param value Setting value
 * @param type Setting type
 * @param description Setting description
 */
export async function setAdminSetting(
  key: string,
  value: any,
  type: 'number' | 'string' | 'boolean' | 'json' = 'string',
  description: string = ''
): Promise<any> {
  try {
    return await AdminSettings.findOneAndUpdate(
      { key },
      { value, type, description, updatedAt: new Date() },
      { new: true, upsert: true }
    );
  } catch (error) {
    console.error('Error setting admin setting:', key, error);
    throw error;
  }
}

/**
 * Initialize default admin settings
 */
export async function initializeDefaultSettings(): Promise<void> {
  try {
    const defaults = [
      {
        key: 'ai_minimum_score',
        value: 70,
        type: 'number',
        description: 'Minimum match score percentage for AI-matched jobs (0-100)',
      },
      {
        key: 'ai_max_jobs_per_page',
        value: 50,
        type: 'number',
        description: 'Maximum number of jobs to display per page',
      },
      {
        key: 'email_notifications_enabled',
        value: true,
        type: 'boolean',
        description: 'Enable email notifications for users',
      },
    ];

    for (const defaultSetting of defaults) {
      const exists = await AdminSettings.findOne({ key: defaultSetting.key });
      if (!exists) {
        await AdminSettings.create(defaultSetting);
      }
    }
  } catch (error) {
    console.error('Error initializing default settings:', error);
  }
}
