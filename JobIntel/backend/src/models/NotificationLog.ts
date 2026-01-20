import mongoose from "mongoose";

const { Schema } = mongoose;

export interface INotificationLog extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  notificationType: 'match' | 'summary' | 'reminder' | 'update' | 'alert';
  channel: 'email' | 'whatsapp' | 'telegram';
  
  // Content
  subject?: string;
  message: string;
  templateId?: string;
  templateData?: Record<string, any>;
  
  // Metadata
  matchId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  
  // Status
  status: 'queued' | 'sent' | 'failed' | 'bounced' | 'unsubscribed';
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  
  // Tracking
  opened?: boolean;
  openedAt?: Date;
  clicked?: boolean;
  clickedAt?: Date;
  clickedLink?: string;
  
  // Preferences
  unsubscribeToken?: string;
  
  payload?: any;
  attempts: number;
  lastError?: string;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    notificationType: {
      type: String,
      enum: ['match', 'summary', 'reminder', 'update', 'alert'],
      default: 'match',
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'telegram'],
      required: true,
    },
    subject: String,
    message: { type: String, required: true },
    templateId: String,
    templateData: Schema.Types.Mixed,
    
    matchId: { type: Schema.Types.ObjectId, ref: "JobMatch" },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'bounced', 'unsubscribed'],
      default: 'queued',
      index: true,
    },
    sentAt: Date,
    failureReason: String,
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    
    opened: { type: Boolean, default: false },
    openedAt: Date,
    clicked: { type: Boolean, default: false },
    clickedAt: Date,
    clickedLink: String,
    
    unsubscribeToken: { type: String, unique: true, sparse: true },
    
    payload: Schema.Types.Mixed,
    attempts: { type: Number, default: 0 },
    lastError: String,
  },
  { timestamps: true }
);

// Indexes for efficient queries
NotificationLogSchema.index({ userId: 1, channel: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, retryCount: 1 });
NotificationLogSchema.index({ sentAt: -1 });

export const NotificationLog = mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
