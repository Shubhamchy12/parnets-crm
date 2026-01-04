import mongoose from 'mongoose';

const adminRegistrationSchema = new mongoose.Schema({
  isCompleted: {
    type: Boolean,
    default: false,
    required: true
  },
  firstAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  registrationIP: {
    type: String,
    required: false
  },
  registrationUserAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Ensure only one registration record exists
adminRegistrationSchema.index({ isCompleted: 1 }, { unique: true, partialFilterExpression: { isCompleted: true } });

// Static method to check if admin registration is completed
adminRegistrationSchema.statics.isRegistrationCompleted = async function() {
  const registration = await this.findOne({ isCompleted: true });
  return !!registration;
};

// Static method to complete registration
adminRegistrationSchema.statics.completeRegistration = async function(adminId, ipAddress, userAgent) {
  const registration = new this({
    isCompleted: true,
    firstAdminId: adminId,
    registrationDate: new Date(),
    registrationIP: ipAddress,
    registrationUserAgent: userAgent
  });
  
  return await registration.save();
};

// Static method to get registration status
adminRegistrationSchema.statics.getRegistrationStatus = async function() {
  const registration = await this.findOne({ isCompleted: true }).populate('firstAdminId', 'name email');
  
  if (registration) {
    return {
      isCompleted: true,
      registrationDate: registration.registrationDate,
      firstAdmin: registration.firstAdminId
    };
  }
  
  return {
    isCompleted: false,
    registrationDate: null,
    firstAdmin: null
  };
};

export default mongoose.model('AdminRegistration', adminRegistrationSchema);