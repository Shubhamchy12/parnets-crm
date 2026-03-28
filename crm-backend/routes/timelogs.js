import express from 'express';
import Timelog from '../models/Timelog.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/timelogs
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, project, employee } = req.query;
    const filter = {};

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      filter.user = req.user._id;
    } else if (employee) {
      filter.user = employee;
    }

    if (project) filter.project = project;

    const total = await Timelog.countDocuments(filter);
    const timelogs = await Timelog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('project', 'name')
      .populate('user', 'name');

    res.json({ success: true, data: { timelogs, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/timelogs/timesheet
router.get('/timesheet', authenticate, async (req, res) => {
  try {
    const { employee } = req.query;
    const filter = {};

    const userId = (!['super_admin', 'admin'].includes(req.user.role)) ? req.user._id : (employee || null);
    if (userId) filter.user = userId;

    const timelogs = await Timelog.find(filter).sort({ createdAt: -1 }).populate('project', 'name');

    const grouped = {};
    timelogs.forEach(t => {
      const date = t.date || (t.startTime ? new Date(t.startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      if (!grouped[date]) grouped[date] = { date, entries: [], totalHours: 0 };
      grouped[date].entries.push(t);
      grouped[date].totalHours += parseFloat(t.hours || 0);
    });

    res.json({ success: true, data: { timesheet: Object.values(grouped) } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/timelogs
router.post('/', authenticate, async (req, res) => {
  try {
    const { description, hours, date, project, startTime, endTime } = req.body;
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      return res.status(400).json({ success: false, message: 'Hours must be greater than 0' });
    }

    const entry = await Timelog.create({
      description,
      hours: parsedHours,
      date,
      project: project || undefined,
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      user: req.user._id,
      userName: req.user.name,
      status: 'pending',
    });

    res.status(201).json({ success: true, message: 'Time logged', data: { timelog: entry } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/timelogs/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const timelog = await Timelog.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true });
    if (!timelog) return res.status(404).json({ success: false, message: 'Timelog not found' });
    res.json({ success: true, data: { timelog } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/timelogs/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const timelog = await Timelog.findByIdAndDelete(req.params.id);
    if (!timelog) return res.status(404).json({ success: false, message: 'Timelog not found' });
    res.json({ success: true, message: 'Timelog deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/timelogs/:id/approve
router.put('/:id/approve', authenticate, authorize('super_admin', 'admin', 'manager'), async (req, res) => {
  try {
    const timelog = await Timelog.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id },
      { new: true }
    );
    if (!timelog) return res.status(404).json({ success: false, message: 'Timelog not found' });
    res.json({ success: true, message: 'Timelog approved', data: { timelog } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
