import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  excerpt: {
    type: String,
    trim: true,
  },
  content: {
    type: Object,
    required: true,
  },
  thumbnail: {
    type: String, // URL of the image
    default: "",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  category_name: {
    type: String,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  is_published: {
    type: Boolean,
    default: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  publishedDate: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

export default mongoose.models.Blog || mongoose.model('Blog', BlogSchema);
