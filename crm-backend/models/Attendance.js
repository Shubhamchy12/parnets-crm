import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  latitude:  Number,
  longitude: Number,
  address:   String,
}, { _id: false });

const entrySchema = new mongoose.Schema({
  type:      { type: String, enum: ['in', 'out'], required: true },
  time:      { type: Date, required: true },
  location:  locationSchema,
  method:    { type: String, enum: ['manual', 'biometric', 'mobile', 'web'], default: 'web' },
  faceVerified: { type: Boolean, default: false },
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required'],
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  // Legacy single check-in / check-out (kept for backward compat)
  checkIn: {
    time:     Date,
    location: locationSchema,
    method:   { type: String, enum: ['manual', 'biometric', 'mobile', 'web'], default: 'web' },
    faceVerified: { type: Boolean, default: false },
  },
  checkOut: {
    time:     Date,
    location: locationSchema,
    method:   { type: String, enum: ['manual', 'biometric', 'mobile', 'web'], default: 'web' },
    faceVerified: { type: Boolean, default: false },
  },
  // All in/out swipes for the day (supports multiple entries)
  entries: [entrySchema],
  breaks: [{
    startTime: Date,
    endTime:   Date,
    reason:    String,
  }],
  totalHours:    { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'late', 'leave'],
    default: 'present',
  },
  notes:      { type: String, trim: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Calculate total hours from entries array (sum of paired in/out durations)
function calcHoursFromEntries(entries) {
  let total = 0;
  let lastIn = null;
  for (const e of entries) {
    if (e.type === 'in') {
      lastIn = e.time;
    } else if (e.type === 'out' && lastIn) {
      total += (e.time - lastIn) / (1000 * 60 * 60);
      lastIn = null;
    }
  }
  return Math.max(0, total);
}

attendanceSchema.pre('save', function (next) {
  // Prefer entries-based calculation if entries exist
  if (this.entries && this.entries.length > 0) {
    const sorted = [...this.entries].sort((a, b) => a.time - b.time);
    this.totalHours = parseFloat(calcHoursFromEntries(sorted).toFixed(2));
    this.overtimeHours = parseFloat(Math.max(0, this.totalHours - 8).toFixed(2));
  } else if (this.checkIn?.time && this.checkOut?.time) {
    const diffHours = (this.checkOut.time - this.checkIn.time) / (1000 * 60 * 60);
    let breakHours = 0;
    (this.breaks || []).forEach(b => {
      if (b.startTime && b.endTime) breakHours += (b.endTime - b.startTime) / (1000 * 60 * 60);
    });
    this.totalHours = parseFloat(Math.max(0, diffHours - breakHours).toFixed(2));
    this.overtimeHours = parseFloat(Math.max(0, this.totalHours - 8).toFixed(2));
  }
  next();
});

export default mongoose.model('Attendance', attendanceSchema);
