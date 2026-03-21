import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Document name is required'], trim: true },
  type: { type: String, default: 'other' },
  mimeType: { type: String },
  url: { type: String, default: '' },
  data: { type: String, default: '' }, // base64 data URL for in-browser preview
  size: { type: Number },
  description: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaderName: { type: String },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

documentSchema.index({ name: 'text' });

export default mongoose.model('Document', documentSchema);
