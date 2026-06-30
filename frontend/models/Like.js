import mongoose from 'mongoose';

const LikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

LikeSchema.index({ user: 1, blog: 1 }, { unique: true });
LikeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Like || mongoose.model('Like', LikeSchema);
