import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  }
}, {
  timestamps: true,
});

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
