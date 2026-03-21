import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    validate: {
      validator: v => /^\d{10}$/.test(v),
      message: 'Phone must be exactly 10 digits',
    },
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  industry: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true
  },
  landline: {
    type: String,
    trim: true,
  },
  // Uploaded documents (file paths)
  photo: { filename: String, path: String, originalName: String },
  aadhaarDoc: { filename: String, path: String, originalName: String },
  panDoc:     { filename: String, path: String, originalName: String },
  gstDoc:     { filename: String, path: String, originalName: String },
  // Bank details
  bankDetails: {
    bankName:          String,
    accountHolderName: String,
    accountNumber:     String,
    ifscCode:          String,
    branchName:        String,
  },
  contactPerson: {
    name: String,
    designation: String,
    phone: String,
    email: String
  },
  // Multiple contacts support
  contacts: [{
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'prospect'],
    default: 'prospect'
  },
  source: {
    type: String,
    enum: ['referral', 'website', 'social_media', 'cold_call', 'linkedin', 'advertisement', 'other'],
    default: 'other'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String]
}, {
  timestamps: true
});

// Index for search
clientSchema.index({ name: 'text', company: 'text', email: 'text' });

export default mongoose.model('Client', clientSchema);