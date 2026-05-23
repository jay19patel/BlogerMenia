import mongoose from 'mongoose';

const PlaylistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  cover_image: {
    type: String,
    default: "",
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  is_public: {
    type: Boolean,
    default: true,
  },
  blogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
  }],
  total_views: {
    type: Number,
    default: 0,
  },
  total_likes: {
    type: Number,
    default: 0,
  },
  blog_count: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
});

export default mongoose.models.Playlist || mongoose.model('Playlist', PlaylistSchema);
