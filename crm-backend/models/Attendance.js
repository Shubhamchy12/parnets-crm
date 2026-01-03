import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  checkIn: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: {
      type: String,
      enum: ['manual', 'biometric', 'mobile', 'web'],
      default: 'web'
    }
  },
  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: {
      type: String,
      enum: ['manual', 'biometric', 'mobile', 'web'],
      default: 'web'
    }
  },
  breaks: [{
    startTime: Date,
    endTime: Date,
    reason: String
  }],
  totalHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'late', 'leave'],
    default: 'present'
  },
  notes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Compound index for employee and date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Calculate total hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkIn.time && this.checkOut.time) {
    const diffMs = this.checkOut.time - this.checkIn.time;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Subtract break time
    let breakHours = 0;
    this.breaks.forEach(breakItem => {
      if (breakItem.startTime && breakItem.endTime) {
        const breakDiffMs = breakItem.endTime - breakItem.startTime;
        breakHours += breakDiffMs / (1000 * 60 * 60);
      }
    });
    
    this.totalHours = Math.max(0, diffHours - breakHours);
    
    // Calculate overtime (assuming 8 hours is standard)
    this.overtimeHours = Math.max(0, this.totalHours - 8);
  }
  next();
});

export default mongoose.model('Attendance', attendanceSchema);