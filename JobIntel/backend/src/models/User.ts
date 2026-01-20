import mongoose from "mongoose";

const { Schema } = mongoose;

export interface IUser extends mongoose.Document {
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  telegramId?: string;
  telegramUsername?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  batch?: string;
  savedJobs?: string[]; // Array of saved job IDs
  roles: string[];
  tier: string;
  notificationPrefs: {
    email: boolean;
    whatsapp: boolean;
    telegram: boolean;
    emailNotifications?: boolean;
    jobAlerts?: boolean;
    applicationUpdates?: boolean;
    weeklyDigest?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  };
  consent?: {
    autoApply?: boolean;
    timestamp?: Date;
  };
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: String,
    phone: String,
    phoneNumber: String,
    whatsappNumber: String,
    telegramId: String,
    telegramUsername: String,
    location: String,
    bio: String,
    skills: { type: [String], default: [] },
    batch: String,
    savedJobs: { type: [String], default: [] }, // Array of saved job IDs
    roles: { type: [String], default: ["user"] },
    tier: { type: String, default: "free" },
    notificationPrefs: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      telegram: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      jobAlerts: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
      quietHoursStart: { type: String, default: "22:00" },
      quietHoursEnd: { type: String, default: "08:00" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    consent: {
      autoApply: { type: Boolean, default: false },
      timestamp: Date,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
