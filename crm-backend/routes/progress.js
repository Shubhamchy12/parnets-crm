import express from 'express';
import DailyProgress from '../models/DailyProgress.js';
import ProjectAssignment from '../models/ProjectAssignment.js';
import Notification from '../models/Notification.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const ADMIN = ['super_admin', 'admin', 'sub_admin', 'manager'];

// GET /api/progress?projectId=&employeeId=
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, employeeId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (projectId) query.project = projectId;
    if (employeeId) query.employee = employeeId;
    // Employees can only see their own
    if (!ADMIN.includes(req.user.role)) query.employee = req.user._id;

    const total = await DailyProgress.countDocuments(query);
    const entries = await DailyProgress.find(query)
      .populate({ path: 'employee', select: 'name email department', options: { strictPopulate: false } })
      .populate({ path: 'adminCommentBy', select: 'name', options: { strictPopulate: false } })
      .sort({ date: -1, createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ 
      success: true, 
      data: { 
        entries,
        pagination: { 
          current: +page, 
          pages: Math.ceil(total / limit), 
          total 
        }
      } 
    });
  } catch (e) {
    console.error('Get progress error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/progress — employee adds today's progress
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, workDone, hoursSpent, completionPercentage, blockers, statusUpdate, files } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId required' });

    // Verify employee is assigned to this project
    if (!ADMIN.includes(req.user.role)) {
      const assignment = await ProjectAssignment.findOne({ project: projectId, employee: req.user._id, status: 'active' });
      if (!assignment) return res.status(403).json({ success: false, message: 'You are not assigned to this project' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if entry already exists for today
    const existing = await DailyProgress.findOne({ project: projectId, employee: req.user._id, date: today });
    if (existing) return res.status(400).json({ success: false, message: 'Progress entry already exists for today. Use PUT to update.' });

    const entry = await DailyProgress.create({
      project: projectId,
      employee: req.user._id,
      date: today,
      workDone,
      hoursSpent,
      completionPercentage,
      blockers,
      statusUpdate: statusUpdate || 'on_track',
      files: files || [],
    });

    const populated = await DailyProgress.findById(entry._id)
      .populate({ path: 'employee', select: 'name email', options: { strictPopulate: false } });

    res.status(201).json({ success: true, message: 'Progress added', data: { entry: populated } });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Progress entry already exists for today' });
    console.error('Add progress error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/progress/:id — employee edits today's entry (only today)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const entry = await DailyProgress.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    // Only owner can edit, and only today's entry
    if (!ADMIN.includes(req.user.role)) {
      if (entry.employee.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      const today = new Date().toISOString().split('T')[0];
      if (entry.date !== today) {
        return res.status(400).json({ success: false, message: 'Past entries cannot be edited' });
      }
    }

    const { workDone, hoursSpent, completionPercentage, blockers, statusUpdate, files } = req.body;
    Object.assign(entry, { workDone, hoursSpent, completionPercentage, blockers, statusUpdate, files: files || entry.files });
    await entry.save();

    const populated = await DailyProgress.findById(entry._id)
      .populate({ path: 'employee', select: 'name email', options: { strictPopulate: false } });

    res.json({ success: true, message: 'Progress updated', data: { entry: populated } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/progress/:id/comment — admin comments on a progress entry
router.post('/:id/comment', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const entry = await DailyProgress.findById(req.params.id).populate('employee', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    entry.adminComment = req.body.comment;
    entry.adminCommentBy = req.user._id;
    entry.adminCommentAt = new Date();
    await entry.save();

    // Notify employee
    await Notification.create({
      recipient: entry.employee._id,
      type: 'progress_comment',
      title: 'Admin commented on your progress',
      message: `${req.user.name || 'Admin'} commented on your progress update: "${req.body.comment?.substring(0, 80)}"`,
      link: `/projects/${entry.project}`,
      data: { projectId: entry.project, progressId: entry._id },
    });

    res.json({ success: true, message: 'Comment added', data: { entry } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
