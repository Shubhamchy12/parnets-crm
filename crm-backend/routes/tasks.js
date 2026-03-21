import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

let tasks = [];
let taskIdCounter = 1;

// GET /api/tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, priority, project } = req.query;
    let result = [...tasks];

    // Non-admins only see their own tasks
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      result = result.filter(t =>
        t.assignee === req.user._id.toString() ||
        t.createdBy === req.user._id.toString()
      );
    }

    if (status) result = result.filter(t => t.status === status);
    if (priority) result = result.filter(t => t.priority === priority);
    if (project) result = result.filter(t => t.project === project);

    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);

    res.json({ success: true, data: { tasks: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', authenticate, logActivity('Task created', 'task', 'low'), async (req, res) => {
  try {
    const { title, description, priority = 'medium', dueDate, project, assignee } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const task = {
      _id: String(taskIdCounter++),
      title, description, priority, dueDate, project, assignee,
      status: 'todo',
      comments: [],
      createdBy: req.user._id.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(task);
    res.status(201).json({ success: true, message: 'Task created', data: { task } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res) => {
  const task = tasks.find(t => t._id === req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, data: { task } });
});

// PUT /api/tasks/:id
router.put('/:id', authenticate, logActivity('Task updated', 'task', 'low'), async (req, res) => {
  const idx = tasks.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });
  tasks[idx] = { ...tasks[idx], ...req.body, _id: tasks[idx]._id, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Task updated', data: { task: tasks[idx] } });
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, logActivity('Task deleted', 'task', 'medium'), async (req, res) => {
  const idx = tasks.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });
  tasks.splice(idx, 1);
  res.json({ success: true, message: 'Task deleted' });
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate, async (req, res) => {
  const task = tasks.find(t => t._id === req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
  const comment = {
    _id: String(Date.now()),
    text: req.body.text,
    author: { _id: req.user._id, name: req.user.name },
    createdAt: new Date().toISOString(),
  };
  task.comments.push(comment);
  res.json({ success: true, data: { comment } });
});

// POST /api/tasks/:id/timelog
router.post('/:id/timelog', authenticate, async (req, res) => {
  const task = tasks.find(t => t._id === req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
  if (!task.timelogs) task.timelogs = [];
  const entry = { _id: String(Date.now()), ...req.body, user: req.user._id, createdAt: new Date().toISOString() };
  task.timelogs.push(entry);
  res.json({ success: true, data: { entry } });
});

export default router;
