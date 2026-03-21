import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

let timelogs = [];
let timelogIdCounter = 1;

// GET /api/timelogs
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, project, employee } = req.query;
    let result = [...timelogs];

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      result = result.filter(t => t.user === req.user._id.toString());
    } else if (employee) {
      result = result.filter(t => t.user === employee);
    }

    if (project) result = result.filter(t => t.project === project);

    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: { timelogs: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/timelogs/timesheet
router.get('/timesheet', authenticate, async (req, res) => {
  try {
    const { week, month, year, employee } = req.query;
    let result = [...timelogs];

    const userId = (!['super_admin', 'admin'].includes(req.user.role)) ? req.user._id.toString() : (employee || null);
    if (userId) result = result.filter(t => t.user === userId);

    // Group by date
    const grouped = {};
    result.forEach(t => {
      const date = t.date || (t.startTime ? t.startTime.split('T')[0] : new Date().toISOString().split('T')[0]);
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
    if (!hours) return res.status(400).json({ success: false, message: 'Hours is required' });

    const entry = {
      _id: String(timelogIdCounter++),
      description, hours: parseFloat(hours), date, project,
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date().toISOString(),
      user: req.user._id.toString(),
      userName: req.user.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    timelogs.push(entry);
    res.status(201).json({ success: true, message: 'Time logged', data: { timelog: entry } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/timelogs/:id
router.put('/:id', authenticate, async (req, res) => {
  const idx = timelogs.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Timelog not found' });
  timelogs[idx] = { ...timelogs[idx], ...req.body, _id: timelogs[idx]._id };
  res.json({ success: true, data: { timelog: timelogs[idx] } });
});

// DELETE /api/timelogs/:id
router.delete('/:id', authenticate, async (req, res) => {
  const idx = timelogs.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Timelog not found' });
  timelogs.splice(idx, 1);
  res.json({ success: true, message: 'Timelog deleted' });
});

// PUT /api/timelogs/:id/approve
router.put('/:id/approve', authenticate, authorize('super_admin', 'admin', 'manager'), async (req, res) => {
  const entry = timelogs.find(t => t._id === req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: 'Timelog not found' });
  entry.status = 'approved';
  entry.approvedBy = req.user._id.toString();
  res.json({ success: true, message: 'Timelog approved', data: { timelog: entry } });
});

export default router;
