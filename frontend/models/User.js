import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    select: false, // Don't return password by default
  },
  full_name: {
    type: String,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  headline: {
    type: String,
    trim: true,
    default: "",
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  bio: {
    type: String,
    trim: true,
    default: "",
  },
  profile_image: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  blog_count: {
    type: Number,
    default: 0,
  },
  total_views: {
    type: Number,
    default: 0,
  },
  total_likes: {
    type: Number,
    default: 0,
  },
  googleId: {
    type: String,
  },
  linkedinId: {
    type: String,
  },
  linkedin_access_token: {
    type: String,
    select: false,
  },
  linkedin_auto_post: {
    type: Boolean,
    default: false,
  },
  linkedin_shared_posts: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
});

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // In case of Google Auth users
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
