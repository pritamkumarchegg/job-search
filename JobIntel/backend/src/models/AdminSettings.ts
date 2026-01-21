import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminSettings extends Document {
  key: string; // Unique identifier for setting
  value: any; // Setting value
  type: 'number' | 'string' | 'boolean' | 'json'; // Type of value
  description: string; // Human-readable description
  updatedBy?: mongoose.Types.ObjectId; // User who last updated
  updatedAt?: Date;
  createdAt?: Date;
}

const AdminSettingsSchema = new Schema<IAdminSettings>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    type: { type: String, enum: ['number', 'string', 'boolean', 'json'], default: 'string' },
    description: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Index for faster lookups
AdminSettingsSchema.index({ key: 1 });

export const AdminSettings = mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema);

/**
 * Settings keys:
 * - ai_minimum_score: Minimum match score for AI-matched jobs (default: 70)
 * - ai_max_jobs_per_page: Maximum jobs per page in pagination (default: 50)
 * - email_notifications_enabled: Enable email notifications (default: true)
 */
