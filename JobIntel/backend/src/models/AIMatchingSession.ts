import mongoose, { Schema, Document } from 'mongoose';

export interface IAIMatchingSession extends Document {
  userId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  type: 'resume_analysis' | 'job_matching' | 'batch_matching';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AIMatchingSessionSchema = new Schema<IAIMatchingSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      sparse: true,
    },
    type: {
      type: String,
      enum: ['resume_analysis', 'job_matching', 'batch_matching'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    inputData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    outputData: {
      type: Schema.Types.Mixed,
    },
    errorMessage: String,
    tokensUsed: Number,
    processingTimeMs: Number,
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
AIMatchingSessionSchema.index({ userId: 1, type: 1, createdAt: -1 });
AIMatchingSessionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IAIMatchingSession>(
  'AIMatchingSession',
  AIMatchingSessionSchema
);
