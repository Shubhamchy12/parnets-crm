import express from 'express';
import Task from '../models/Task.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// GET /api/tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, priority, project } = req.query;
    const filter = {};

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      filter.$or = [{ assignee: req.user._id }, { createdBy: req.user._id }];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = project;

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('assignee', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name');

    res.json({ success: true, data: { tasks, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', authenticate, logActivity('Task created', 'task', 'low'), async (req, res) => {
  try {
    const { title, description, priority = 'medium', dueDate, project, assignee } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const task = await Task.create({
      title, description, priority, dueDate,
      project: project || undefined,
      assignee: assignee || undefined,
      status: 'todo',
      createdBy: req.user._id,
    });

    const populated = await task.populate(['assignee', 'project']);
    res.status(201).json({ success: true, message: 'Task created', data: { task: populated } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('project', 'name')
      .populate('createdBy', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: { task } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', authenticate, logActivity('Task updated', 'task', 'low'), async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true, runValidators: true })
      .populate('assignee', 'name')
      .populate('project', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task updated', data: { task } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, logActivity('Task deleted', 'task', 'medium'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const comment = {
      text: req.body.text,
      author: { _id: req.user._id, name: req.user.name },
      createdAt: new Date(),
    };
    task.comments.push(comment);
    await task.save();
    res.json({ success: true, data: { comment } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks/:id/timelog
router.post('/:id/timelog', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const entry = { ...req.body, user: req.user._id, createdAt: new Date() };
    task.timelogs.push(entry);
    await task.save();
    res.json({ success: true, data: { entry } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
