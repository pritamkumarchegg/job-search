import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  subject: string;
  body: string;
  read: boolean;
  replies?: {
    senderId: mongoose.Types.ObjectId;
    body: string;
    createdAt: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    replies: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Index for queries
MessageSchema.index({ recipientId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
