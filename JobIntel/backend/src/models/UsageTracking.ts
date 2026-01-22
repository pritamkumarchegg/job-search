import mongoose from 'mongoose';
const { Schema } = mongoose;

export interface IUsageTracking extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  actionType: 'apply' | 'viewDetails';
  timestamp: Date;
  ipAddress?: string;
}

const UsageTrackingSchema = new Schema<IUsageTracking>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  actionType: { type: String, enum: ['apply', 'viewDetails'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: String,
}, { timestamps: true });

// Compound index for efficient queries (user + time window)
UsageTrackingSchema.index({ userId: 1, timestamp: -1 });

export const UsageTracking = mongoose.model<IUsageTracking>('UsageTracking', UsageTrackingSchema);
