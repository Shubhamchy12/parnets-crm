import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, date, status, month, year } = req.query;
    
    const query = {};
    
    // If not admin, only show own attendance
    if (!['super_admin', 'admin', 'sub_admin'].includes(req.user.role)) {
      query.employee = req.user._id;
    } else if (employee) {
      query.employee = employee;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (status) query.status = status;

    const attendance = await Attendance.find(query)
      .populate('employee', 'name email department')
      .populate('approvedBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: {
        attendance,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance'
    });
  }
});

// @route   POST /api/attendance/checkin
// @desc    Check in attendance
// @access  Private
router.post('/checkin', [
  authenticate,
  body('date').optional().isISO8601(),
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat()
], logActivity('Attendance check-in', 'attendance', 'low'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const today = req.body.date ? new Date(req.body.date) : new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.user._id,
      date: today
    });

    if (existingAttendance && existingAttendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    const checkInData = {
      time: new Date(),
      method: 'web'
    };

    if (req.body.location) {
      checkInData.location = req.body.location;
    }

    let attendance;
    if (existingAttendance) {
      existingAttendance.checkIn = checkInData;
      attendance = await existingAttendance.save();
    } else {
      attendance = new Attendance({
        employee: req.user._id,
        date: today,
        checkIn: checkInData
      });
      await attendance.save();
    }

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employee', 'name email');

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: { attendance: populatedAttendance }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// @route   POST /api/attendance/checkout
// @desc    Check out attendance
// @access  Private
router.post('/checkout', [
  authenticate,
  body('date').optional().isISO8601(),
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat()
], logActivity('Attendance check-out', 'attendance', 'low'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const today = req.body.date ? new Date(req.body.date) : new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: today
    });

    if (!attendance || !attendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today'
      });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out today'
      });
    }

    const checkOutData = {
      time: new Date(),
      method: 'web'
    };

    if (req.body.location) {
      checkOutData.location = req.body.location;
    }

    attendance.checkOut = checkOutData;
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employee', 'name email');

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: { attendance: populatedAttendance }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-out'
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance status
// @access  Private
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: today
    }).populate('employee', 'name email');

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching today\'s attendance'
    });
  }
});

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private (Admin only)
router.get('/stats', authenticate, authorize('super_admin', 'admin', 'sub_admin'), async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let startDate, endDate;
    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      // Current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const totalRecords = await Attendance.countDocuments({
      date: { $gte: startDate, $lte: endDate }
    });

    const statusStats = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const avgHours = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate }, totalHours: { $gt: 0 } } },
      { $group: { _id: null, avgHours: { $avg: '$totalHours' } } }
    ]);

    const lateArrivals = await Attendance.countDocuments({
      date: { $gte: startDate, $lte: endDate },
      status: 'late'
    });

    res.json({
      success: true,
      data: {
        totalRecords,
        statusStats,
        avgHours: avgHours[0]?.avgHours || 0,
        lateArrivals,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance statistics'
    });
  }
});

export default router;