import mongoose from 'mongoose';

const BookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
  section_id: { type: String },
  section_title: { type: String },
}, { timestamps: true });

BookmarkSchema.index({ user: 1, blog: 1 }, { unique: true });
BookmarkSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.models.Bookmark || mongoose.model('Bookmark', BookmarkSchema);
