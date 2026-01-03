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
    trim: true
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
  contactPerson: {
    name: String,
    designation: String,
    phone: String,
    email: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect'],
    default: 'prospect'
  },
  source: {
    type: String,
    enum: ['referral', 'website', 'social_media', 'cold_call', 'advertisement', 'other'],
    default: 'other'
  },
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