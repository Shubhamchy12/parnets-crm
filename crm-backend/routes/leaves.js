import express from 'express';
import Leave from '../models/Leave.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

const LEAVE_BALANCE = {
  cl: { total: 12 },
  sl: { total: 10 },
  el: { total: 15 },
};

const HOLIDAYS = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-25', name: 'Holi' },
  { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-24', name: 'Dussehra' },
  { date: '2026-11-12', name: 'Diwali' },
  { date: '2026-12-25', name: 'Christmas' },
];

// GET /api/leaves — my leaves
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { employee: req.user._id };
    if (status) filter.status = status;
    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    res.json({ success: true, data: { leaves, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leaves/balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const myLeaves = await Leave.find({ employee: req.user._id, status: 'approved' });
    const used = { cl: 0, sl: 0, el: 0 };
    myLeaves.forEach(l => {
      const type = l.leaveType?.toLowerCase().replace(' ', '_');
      if (type === 'casual_leave' || type === 'cl') used.cl += l.days || 1;
      else if (type === 'sick_leave' || type === 'sl') used.sl += l.days || 1;
      else if (type === 'earned_leave' || type === 'el') used.el += l.days || 1;
    });
    res.json({
      success: true,
      data: {
        balance: {
          cl: { total: LEAVE_BALANCE.cl.total, used: used.cl },
          sl: { total: LEAVE_BALANCE.sl.total, used: used.sl },
          el: { total: LEAVE_BALANCE.el.total, used: used.el },
        }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leaves/holidays
router.get('/holidays', authenticate, async (req, res) => {
  res.json({ success: true, data: { holidays: HOLIDAYS } });
});

// GET /api/leaves/team — manager/admin view
router.get('/team', authenticate, authorize('super_admin', 'admin', 'manager', 'sub_admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('employee', 'name department');
    res.json({ success: true, data: { leaves, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leaves/admin
router.get('/admin', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    res.json({ success: true, data: { leaves, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/leaves — apply leave
router.post('/', authenticate, logActivity('Leave application', 'leave', 'low'), async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason, employeeId } = req.body;
    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'leaveType, fromDate, toDate, reason are required' });
    }

    const isAdmin = ['super_admin', 'admin', 'manager'].includes(req.user.role);
    let targetUser = req.user;
    if (isAdmin && employeeId && employeeId !== req.user._id.toString()) {
      const emp = await User.findById(employeeId).select('name email department');
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      targetUser = emp;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employee: targetUser._id,
      employeeName: targetUser.name,
      leaveType, fromDate, toDate, days, reason,
      status: 'pending',
      appliedBy: req.user._id,
      appliedByName: req.user.name,
    });

    res.status(201).json({ success: true, message: 'Leave applied successfully', data: { leave } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leaves/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: { leave } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/leaves/:id/approve
router.put('/:id/approve', authenticate, authorize('super_admin', 'admin', 'manager'), logActivity('Leave approved', 'leave', 'medium'), async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, message: 'Leave approved', data: { leave } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/leaves/:id/reject
router.put('/:id/reject', authenticate, authorize('super_admin', 'admin', 'manager'), logActivity('Leave rejected', 'leave', 'medium'), async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectedBy: req.user._id, rejectionReason: req.body.reason || '' },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, message: 'Leave rejected', data: { leave } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
