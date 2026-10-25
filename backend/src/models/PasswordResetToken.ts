import { Schema, model, type InferSchemaType } from 'mongoose';

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export type PasswordResetTokenDocument = InferSchemaType<typeof passwordResetTokenSchema>;

const PasswordResetToken = model<PasswordResetTokenDocument>('PasswordResetToken', passwordResetTokenSchema);
export default PasswordResetToken;
