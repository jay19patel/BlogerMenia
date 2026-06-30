import mongoose from 'mongoose';

const ChatSessionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  conversation: { type: [{ role: String, content: String }], default: [] },
  blog_state: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

ChatSessionSchema.index({ updatedAt: -1 });

export default mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);
