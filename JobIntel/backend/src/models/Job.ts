import mongoose from "mongoose";

const { Schema } = mongoose;

export interface IJob extends mongoose.Document {
  source: string;
  companyId?: mongoose.Types.ObjectId;
  title: string;
  location?: string;
  country?: string;
  employmentType?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  ctc?: string;
  applyUrl?: string;
  externalId?: string;
  rawHtml?: string;
  parsedAt?: Date;
  status: string;
  meta?: any;
  batch?: string[];
  eligibleBatches?: number[];
  createdAt?: Date;
  postedAt?: Date;
  updatedAt?: Date;
}

const JobSchema = new Schema<IJob>(
  {
    source: String,
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    title: { type: String, required: true, index: true },
    location: String,
    country: { type: String, index: true, default: 'India' },
    employmentType: String,
    description: String,
    requirements: [String],
    responsibilities: [String],
    ctc: String,
    applyUrl: String,
    externalId: { type: String, index: true },
    rawHtml: String,
    parsedAt: Date,
    status: { type: String, default: "draft" },
    meta: Schema.Types.Mixed,
    batch: [String],
    eligibleBatches: [Number],
  },
  { timestamps: true }
);

export const Job = mongoose.model<IJob>("Job", JobSchema);
