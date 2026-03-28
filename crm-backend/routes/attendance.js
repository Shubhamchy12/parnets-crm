import express from 'express';
import Attendance from '../models/Attendance.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';
import mongoose from 'mongoose';

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(String(id));
}

function todayRange() {
  const now = new Date();
  return {
    startOfDay: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
    endOfDay:   new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  };
}

// GET /api/attendance
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, date, status, month, year } = req.query;
    const query = {};
    if (!['super_admin', 'admin', 'sub_admin'].includes(req.user.role)) {
      if (isValidObjectId(req.user._id)) query.employee = req.user._id;
      else return res.json({ success: true, data: { attendance: [], pagination: { current: 1, pages: 0, total: 0 } } });
    } else if (employee && isValidObjectId(employee)) {
      query.employee = employee;
    }
    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    if (month && year) { query.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0) }; }
    if (status) query.status = status;
    const attendance = await Attendance.find(query)
      .populate({ path: 'employee', select: 'name email department', options: { strictPopulate: false } })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Attendance.countDocuments(query);
    res.json({ success: true, data: { attendance, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/swipe
// Handles multiple in/out entries per day. Automatically determines next type (in/out).
// Body: { location: { latitude, longitude, address }, faceVerified }
router.post('/swipe', authenticate, logActivity('Attendance swipe', 'attendance', 'low'), async (req, res) => {
  try {
    if (!isValidObjectId(req.user._id))
      return res.status(400).json({ success: false, message: 'Invalid user session. Please re-login.' });

    const { location, faceVerified = false } = req.body;
    const { startOfDay, endOfDay } = todayRange();
    const now = new Date();

    let attendance = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // Determine next swipe type
    const entries = attendance?.entries || [];
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
    const swipeType = !lastEntry || lastEntry.type === 'out' ? 'in' : 'out';

    const newEntry = {
      type: swipeType,
      time: now,
      method: 'web',
      faceVerified,
      ...(location ? { location } : {}),
    };

    if (!attendance) {
      attendance = await Attendance.create({
        employee: req.user._id,
        date: startOfDay,
        status: 'present',
        entries: [newEntry],
        // Also set legacy checkIn for backward compat
        checkIn: swipeType === 'in' ? { time: now, method: 'web', faceVerified, ...(location ? { location } : {}) } : undefined,
      });
    } else {
      attendance.entries.push(newEntry);
      // Keep legacy checkIn/checkOut in sync
      if (swipeType === 'in' && !attendance.checkIn?.time) {
        attendance.checkIn = { time: now, method: 'web', faceVerified, ...(location ? { location } : {}) };
      }
      if (swipeType === 'out') {
        attendance.checkOut = { time: now, method: 'web', faceVerified, ...(location ? { location } : {}) };
      }
      await attendance.save();
    }

    const populated = await Attendance.findById(attendance._id)
      .populate({ path: 'employee', select: 'name email department', options: { strictPopulate: false } });

    const msg = swipeType === 'in' ? 'Checked in successfully' : 'Checked out successfully';
    res.json({ success: true, message: msg, data: { attendance: populated, swipeType } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/checkin (legacy — kept for backward compat)
router.post('/checkin', authenticate, logActivity('Attendance check-in', 'attendance', 'low'), async (req, res) => {
  try {
    if (!isValidObjectId(req.user._id))
      return res.status(400).json({ success: false, message: 'Invalid user session. Please re-login.' });

    const { location, faceVerified = false } = req.body;
    const { startOfDay, endOfDay } = todayRange();
    const now = new Date();

    const existing = await Attendance.findOne({ employee: req.user._id, date: { $gte: startOfDay, $lte: endOfDay } });
    if (existing?.checkIn?.time)
      return res.status(400).json({ success: false, message: 'Already checked in today' });

    const checkInData = { time: now, method: 'web', faceVerified, ...(location ? { location } : {}) };
    const entry = { type: 'in', time: now, method: 'web', faceVerified, ...(location ? { location } : {}) };

    let attendance;
    if (existing) {
      existing.set('checkIn', checkInData);
      existing.entries.push(entry);
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        employee: req.user._id,
        date: startOfDay,
        checkIn: checkInData,
        entries: [entry],
        status: 'present',
      });
    }

    const populated = await Attendance.findById(attendance._id)
      .populate({ path: 'employee', select: 'name email department', options: { strictPopulate: false } });
    res.json({ success: true, message: 'Checked in successfully', data: { attendance: populated } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attendance/checkout (legacy — kept for backward compat)
router.post('/checkout', authenticate, logActivity('Attendance check-out', 'attendance', 'low'), async (req, res) => {
  try {
    if (!isValidObjectId(req.user._id))
      return res.status(400).json({ success: false, message: 'Invalid user session. Please re-login.' });

    const { location, faceVerified = false } = req.body;
    const { startOfDay, endOfDay } = todayRange();
    const now = new Date();

    const attendance = await Attendance.findOne({ employee: req.user._id, date: { $gte: startOfDay, $lte: endOfDay } });
    if (!attendance?.checkIn?.time)
      return res.status(400).json({ success: false, message: 'No check-in found for today' });
    if (attendance.checkOut?.time)
      return res.status(400).json({ success: false, message: 'Already checked out today' });

    const checkOutData = { time: now, method: 'web', faceVerified, ...(location ? { location } : {}) };
    attendance.set('checkOut', checkOutData);
    attendance.entries.push({ type: 'out', time: now, method: 'web', faceVerified, ...(location ? { location } : {}) });
    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate({ path: 'employee', select: 'name email department', options: { strictPopulate: false } });
    res.json({ success: true, message: 'Checked out successfully', data: { attendance: populated } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attendance/today
router.get('/today', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.user._id)) return res.json({ success: true, data: { attendance: null } });
    const { startOfDay, endOfDay } = todayRange();
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate({ path: 'employee', select: 'name email', options: { strictPopulate: false } });
    res.json({ success: true, data: { attendance } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attendance/stats
router.get('/stats', authenticate, authorize('super_admin', 'admin', 'sub_admin'), async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalRecords = await Attendance.countDocuments({ date: { $gte: start, $lte: end } });
    const statusStats = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: { totalRecords, statusStats, avgHours: 0, lateArrivals: 0 } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/attendance/:id/override
router.put('/:id/override', authenticate, authorize('super_admin', 'admin', 'sub_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });
    const { checkIn, checkOut, status, notes } = req.body;
    if (checkIn?.time) attendance.checkIn.time = new Date(checkIn.time);
    if (checkOut?.time) attendance.checkOut.time = new Date(checkOut.time);
    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;
    if (isValidObjectId(req.user._id)) attendance.approvedBy = req.user._id;
    await attendance.save();
    res.json({ success: true, message: 'Attendance overridden', data: { attendance } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
