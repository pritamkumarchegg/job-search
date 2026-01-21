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
  // Matching-related fields
  skillsRating?: Record<string, number>; // skill: rating (0-5)
  targetRoles?: string[]; // Desired job roles
  targetLocations?: string[]; // Preferred locations
  targetTechStack?: string[]; // Preferred technologies
  targetDomains?: string[]; // Preferred domains
  experienceYears?: number; // Years of experience
  careerLevel?: 'fresher' | 'junior' | 'mid' | 'senior' | 'lead';
  workModePreference?: 'remote' | 'onsite' | 'hybrid';
  profileCompleteness?: number; // Percentage (0-100)
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
    // Matching-related fields
    skillsRating: { type: Map, of: Number, default: new Map() }, // skill: rating (0-5)
    targetRoles: { type: [String], default: [] },
    targetLocations: { type: [String], default: ["India"] },
    targetTechStack: { type: [String], default: [] },
    targetDomains: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0 },
    careerLevel: { type: String, enum: ['fresher', 'junior', 'mid', 'senior', 'lead'], default: 'fresher' },
    workModePreference: { type: String, enum: ['remote', 'onsite', 'hybrid'], default: 'hybrid' },
    profileCompleteness: { type: Number, default: 0 },
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
